import { requireOrganization } from "@features/auth/server/guards";
import { buildAuthUrl, exchangeCode, refreshAccessToken } from "@services/oauth/flow.server";
import { buildOAuthState, parseOAuthState } from "@services/oauth/state.server";
import { getBaseUrl } from "@utils/base-url";
import { getEnv } from "@utils/get-env";
import { and, eq } from "drizzle-orm";
import { data, redirect } from "react-router";
import { getDb } from "@/db";
import { feedbackPosts, integrations, postExternalLinks } from "@/db/schema";
import {
  deleteIntegration,
  deletePostExternalLink,
  insertPostExternalLink,
  updateIntegrationSettings,
  upsertPostExternalLink,
} from "../../server/mutations";
import { requireAdminRole } from "../../server/permissions";
import { getIntegration, getOrgSlugFromId, parseSettings } from "../../server/queries";
import {
  createJiraIssue,
  deleteJiraWebhooks,
  getJiraCloudResources,
  getJiraIssueByKey,
  getJiraProjectStatuses,
  getJiraProjects,
  registerJiraWebhook,
} from "./client";
import { jiraOAuth } from "./oauth";
import { JiraActionSchema, type JiraSettings } from "./schemas";

const LOG = "[jira-service]";

const CALLBACK_PATH = "/api/jira";

function callbackUrl(): string {
  return `${getBaseUrl()}${CALLBACK_PATH}`;
}

function requireJiraEnv() {
  const env = getEnv();
  if (!env.JIRA_CLIENT_ID || !env.JIRA_CLIENT_SECRET) {
    throw new Response("Jira OAuth not configured", { status: 501 });
  }
  return { clientId: env.JIRA_CLIENT_ID, clientSecret: env.JIRA_CLIENT_SECRET };
}

// Retries fn once after refreshing the access token on a 401 error.
async function withTokenRefresh<T>(
  organizationId: string,
  fn: (token: string) => Promise<T>,
): Promise<T> {
  const db = getDb();
  const integration = await getIntegration(organizationId, "jira");
  if (!integration?.accessToken) throw new Error("Jira not connected");

  try {
    return await fn(integration.accessToken);
  } catch (err) {
    if (err instanceof Error && err.message.includes("401") && integration.refreshToken) {
      const env = getEnv();
      if (!env.JIRA_CLIENT_ID || !env.JIRA_CLIENT_SECRET) throw err;
      const { accessToken: newToken, refreshToken: newRefresh } = await refreshAccessToken(
        jiraOAuth,
        integration.refreshToken,
        env.JIRA_CLIENT_ID,
        env.JIRA_CLIENT_SECRET,
      );
      await db
        .update(integrations)
        .set({
          accessToken: newToken,
          refreshToken: newRefresh ?? integration.refreshToken,
          updatedAt: new Date(),
        })
        .where(
          and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "jira")),
        );
      return await fn(newToken);
    }
    throw err;
  }
}

// ─── Loader ──────────────────────────────────────────────────────────────────

export async function handleJiraLoader(request: Request) {
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (intent === "connect") {
    const { organizationId } = await requireOrganization(request);
    const { clientId } = requireJiraEnv();
    const oauthState = buildOAuthState(organizationId);
    return redirect(buildAuthUrl(jiraOAuth, clientId, callbackUrl(), oauthState));
  }

  if (error) return redirect("/");

  if (code && state) {
    const parsed = parseOAuthState(state);
    if (!parsed) return redirect("/");

    const { clientId, clientSecret } = requireJiraEnv();

    try {
      const { accessToken, refreshToken } = await exchangeCode(
        jiraOAuth,
        code,
        clientId,
        clientSecret,
        callbackUrl(),
      );
      const cloudResources = await getJiraCloudResources(accessToken);
      if (!cloudResources.length) throw new Error("No accessible Jira Cloud instances");

      const existing = await getIntegration(parsed.orgId, "jira");
      const existingSettings = parseSettings<JiraSettings>(existing?.settings ?? null);

      const primaryCloud = cloudResources[0];
      const cloudId = existingSettings?.cloudId ?? primaryCloud.id;
      const selectedCloud = cloudResources.find((r) => r.id === cloudId) ?? primaryCloud;

      if (
        existing?.accessToken &&
        existingSettings?.cloudId &&
        existingSettings.webhookIds?.length
      ) {
        await deleteJiraWebhooks(
          existing.accessToken,
          existingSettings.cloudId,
          existingSettings.webhookIds,
        ).catch(() => {});
      }

      let webhookIds: number[] | undefined;
      let webhookSecret: string | undefined;
      let webhookExpiresAt: string | undefined;

      const webhookUrl = `${getBaseUrl()}/api/jira/webhook?orgId=${parsed.orgId}&secret=`;
      const isLocal = webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1");

      if (isLocal) {
        console.warn(`${LOG} OAuth callback — webhook skipped, local URL detected`);
      } else {
        try {
          webhookSecret = crypto.randomUUID();
          console.log(`${LOG} registering webhook cloudId=${selectedCloud.id} orgId=${parsed.orgId}`);
          const reg = await registerJiraWebhook(
            accessToken,
            selectedCloud.id,
            `${webhookUrl}${webhookSecret}`,
          );
          webhookIds = reg.ids;
          webhookExpiresAt = reg.expiresAt;
          console.log(`${LOG} webhook registered ids=${JSON.stringify(webhookIds)} expiresAt=${webhookExpiresAt}`);
        } catch (err) {
          console.error(
            `${LOG} webhook registration failed — issue sync will NOT work:`,
            err instanceof Error ? err.message : err,
          );
          webhookSecret = undefined;
        }
      }

      const settings: JiraSettings = {
        cloudId: selectedCloud.id,
        cloudUrl: selectedCloud.url,
        cloudName: selectedCloud.name,
        cloudResources,
        defaultProjectKey: existingSettings?.defaultProjectKey,
        autoCreateIssues: existingSettings?.autoCreateIssues ?? false,
        statusMappings: existingSettings?.statusMappings,
        webhookIds,
        webhookSecret,
        webhookExpiresAt,
      };

      const db = getDb();
      await db
        .insert(integrations)
        .values({
          organizationId: parsed.orgId,
          provider: "jira",
          accessToken,
          refreshToken,
          settings: JSON.stringify(settings),
        })
        .onConflictDoUpdate({
          target: [integrations.organizationId, integrations.provider],
          set: {
            accessToken,
            refreshToken,
            settings: JSON.stringify(settings),
            updatedAt: new Date(),
          },
        });
    } catch {
      /* Redirect even on error — UI will show "not connected" */
    }

    const orgSlug = await getOrgSlugFromId(parsed.orgId);
    return redirect(orgSlug ? `/${orgSlug}/settings/integrations/jira` : "/");
  }

  return data({});
}

// ─── Action ──────────────────────────────────────────────────────────────────

export async function handleJiraAction(request: Request) {
  const { session, organizationId } = await requireOrganization(request);
  await requireAdminRole(organizationId, session.user.id);

  const body = await request.json();
  const parsed = JiraActionSchema.safeParse(body);
  if (!parsed.success) {
    return data({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const input = parsed.data;
  const db = getDb();

  if (input.intent === "select_cloud") {
    const integration = await getIntegration(organizationId, "jira");
    if (!integration) return data({ error: "Jira not connected" }, { status: 400 });
    const settings = parseSettings<JiraSettings>(integration.settings) ?? ({} as JiraSettings);
    const cloud = settings.cloudResources?.find((r) => r.id === input.cloudId);
    if (!cloud) return data({ error: "Cloud instance not found" }, { status: 404 });

    let newWebhookIds = settings.webhookIds;
    let newWebhookSecret = settings.webhookSecret;
    let newWebhookExpiresAt = settings.webhookExpiresAt;

    const webhookUrl = `${getBaseUrl()}/api/jira/webhook?orgId=${organizationId}&secret=`;
    const isLocal = webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1");

    if (!isLocal && settings.cloudId) {
      try {
        if (settings.webhookIds?.length) {
          await deleteJiraWebhooks(
            integration.accessToken!,
            settings.cloudId,
            settings.webhookIds,
          ).catch(() => {});
        }
        newWebhookSecret = crypto.randomUUID();
        const reg = await registerJiraWebhook(
          integration.accessToken!,
          cloud.id,
          `${webhookUrl}${newWebhookSecret}`,
        );
        newWebhookIds = reg.ids;
        newWebhookExpiresAt = reg.expiresAt;
      } catch {
        newWebhookSecret = undefined;
        newWebhookIds = undefined;
      }
    }

    await db
      .update(integrations)
      .set({
        settings: JSON.stringify({
          ...settings,
          cloudId: cloud.id,
          cloudUrl: cloud.url,
          cloudName: cloud.name,
          defaultProjectKey: undefined,
          statusMappings: undefined,
          webhookIds: newWebhookIds,
          webhookSecret: newWebhookSecret,
          webhookExpiresAt: newWebhookExpiresAt,
        }),
      })
      .where(
        and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "jira")),
      );
    return data({ success: true });
  }

  if (input.intent === "list_projects") {
    try {
      const integration = await getIntegration(organizationId, "jira");
      const settings = parseSettings<JiraSettings>(integration?.settings ?? null);
      if (!settings?.cloudId) return data({ error: "No Jira Cloud selected" }, { status: 400 });
      const cloudId = settings.cloudId;
      const projects = await withTokenRefresh(organizationId, (token) =>
        getJiraProjects(token, cloudId),
      );
      return data({ projects });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to fetch projects" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "list_project_statuses") {
    try {
      const integration = await getIntegration(organizationId, "jira");
      const settings = parseSettings<JiraSettings>(integration?.settings ?? null);
      if (!settings?.cloudId) return data({ error: "No Jira Cloud selected" }, { status: 400 });
      const cloudId = settings.cloudId;
      const statuses = await withTokenRefresh(organizationId, (token) =>
        getJiraProjectStatuses(token, cloudId, input.projectKey),
      );
      return data({ statuses });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to fetch statuses" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "update_settings") {
    console.log(
      `${LOG} update_settings orgId=${organizationId} project=${input.defaultProjectKey ?? "none"} autoCreate=${input.autoCreateIssues}`,
    );
    const integration = await getIntegration(organizationId, "jira");
    if (!integration?.accessToken) return data({ error: "No Jira integration found" }, { status: 400 });
    const settings = parseSettings<JiraSettings>(integration.settings) ?? ({} as JiraSettings);

    let { webhookIds, webhookSecret, webhookExpiresAt } = settings;
    const projectKey = input.defaultProjectKey ?? settings.defaultProjectKey;
    const projectChanged = input.defaultProjectKey && input.defaultProjectKey !== settings.defaultProjectKey;
    const noWebhook = !webhookIds?.length;
    const webhookUrl = `${getBaseUrl()}/api/jira/webhook?orgId=${organizationId}&secret=`;
    const isLocal = webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1");

    if (projectKey && !isLocal && (noWebhook || projectChanged)) {
      try {
        if (webhookIds?.length && settings.cloudId) {
          console.log(`${LOG} deleting old webhooks ids=${JSON.stringify(webhookIds)}`);
          await deleteJiraWebhooks(integration.accessToken, settings.cloudId, webhookIds).catch(
            (err) => console.warn(`${LOG} failed to delete old webhooks:`, err),
          );
        }
        webhookSecret = crypto.randomUUID();
        const jqlFilter = `project = ${projectKey}`;
        console.log(`${LOG} registering webhook jqlFilter="${jqlFilter}" cloudId=${settings.cloudId}`);
        const reg = await registerJiraWebhook(
          integration.accessToken,
          settings.cloudId!,
          `${webhookUrl}${webhookSecret}`,
          jqlFilter,
        );
        webhookIds = reg.ids;
        webhookExpiresAt = reg.expiresAt;
        console.log(`${LOG} webhook registered ids=${JSON.stringify(webhookIds)} expiresAt=${webhookExpiresAt}`);
      } catch (err) {
        console.error(
          `${LOG} webhook registration failed — issue sync will NOT work:`,
          err instanceof Error ? err.message : err,
        );
      }
    } else if (isLocal) {
      console.warn(`${LOG} webhook skipped — local URL, issue sync will NOT work`);
    }

    await updateIntegrationSettings(
      organizationId,
      "jira",
      {
        ...settings,
        defaultProjectKey: projectKey,
        autoCreateIssues: input.autoCreateIssues,
        statusMappings: input.statusMappings ?? settings.statusMappings,
        webhookIds,
        webhookSecret,
        webhookExpiresAt,
      },
      session.user.id,
    );
    console.log(`${LOG} update_settings done orgId=${organizationId} hasWebhook=${!!webhookIds?.length}`);
    return data({ success: true });
  }

  if (input.intent === "disconnect") {
    console.log(`${LOG} disconnect orgId=${organizationId}`);
    const integration = await getIntegration(organizationId, "jira");
    if (integration?.accessToken) {
      const settings = parseSettings<JiraSettings>(integration.settings);
      if (settings?.cloudId && settings.webhookIds?.length) {
        console.log(`${LOG} deleting webhooks ids=${JSON.stringify(settings.webhookIds)}`);
        await deleteJiraWebhooks(
          integration.accessToken,
          settings.cloudId,
          settings.webhookIds,
        ).catch((err) => console.warn(`${LOG} failed to delete webhooks on disconnect:`, err));
      } else {
        console.warn(`${LOG} disconnect — no webhookIds, webhooks may still exist in Jira`);
      }
    }
    await deleteIntegration(organizationId, "jira");
    console.log(`${LOG} disconnect done orgId=${organizationId}`);
    return data({ success: true });
  }

  if (input.intent === "create_issue") {
    const [integration, post] = await Promise.all([
      getIntegration(organizationId, "jira"),
      db.query.feedbackPosts.findFirst({
        where: and(
          eq(feedbackPosts.id, input.postId),
          eq(feedbackPosts.organizationId, organizationId),
        ),
        columns: { id: true, title: true, description: true },
      }),
    ]);

    if (!integration?.accessToken) return data({ error: "Jira not connected" }, { status: 400 });
    const settings = parseSettings<JiraSettings>(integration.settings);
    if (!settings?.cloudId || !settings.cloudUrl)
      return data({ error: "No Jira Cloud selected" }, { status: 400 });
    const projectKey = input.projectKey ?? settings.defaultProjectKey;
    if (!projectKey)
      return data(
        { error: "No project selected — set a default project in Jira settings" },
        { status: 400 },
      );
    if (!post) return data({ error: "Post not found" }, { status: 404 });

    const existingLink = await db.query.postExternalLinks.findFirst({
      where: and(
        eq(postExternalLinks.postId, input.postId),
        eq(postExternalLinks.provider, "jira"),
      ),
      columns: { id: true },
    });
    if (existingLink)
      return data({ error: "Post already linked to a Jira issue" }, { status: 400 });

    try {
      const description = post.description
        ? `${post.description}\n\nCreated from Feediyo feedback #${post.id}`
        : `Created from Feediyo feedback #${post.id}`;
      const { cloudId, cloudUrl } = settings;
      const issue = await withTokenRefresh(organizationId, (token) =>
        createJiraIssue(token, cloudId, cloudUrl, projectKey, post.title, description),
      );
      await insertPostExternalLink({
        postId: input.postId,
        organizationId,
        provider: "jira",
        externalId: issue.id,
        externalUrl: issue.url,
        identifier: issue.key,
        externalTitle: issue.summary,
        externalStatus: issue.statusName,
        linkedByUserId: session.user.id,
      });
      return data({ success: true, issue });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to create Jira issue" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "link_issue") {
    const [integration, post] = await Promise.all([
      getIntegration(organizationId, "jira"),
      db.query.feedbackPosts.findFirst({
        where: and(
          eq(feedbackPosts.id, input.postId),
          eq(feedbackPosts.organizationId, organizationId),
        ),
        columns: { id: true },
      }),
    ]);

    if (!integration?.accessToken) return data({ error: "Jira not connected" }, { status: 400 });
    if (!post) return data({ error: "Post not found" }, { status: 404 });
    const settings = parseSettings<JiraSettings>(integration.settings);
    if (!settings?.cloudId || !settings.cloudUrl)
      return data({ error: "No Jira Cloud selected" }, { status: 400 });

    try {
      const { cloudId, cloudUrl } = settings;
      const issue = await withTokenRefresh(organizationId, (token) =>
        getJiraIssueByKey(token, cloudId, cloudUrl, input.issueKeyOrId),
      );
      await upsertPostExternalLink({
        postId: input.postId,
        organizationId,
        provider: "jira",
        externalId: issue.id,
        externalUrl: issue.url,
        identifier: issue.key,
        externalTitle: issue.summary,
        externalStatus: issue.statusName,
        linkedByUserId: session.user.id,
      });
      return data({ success: true, issue });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to link Jira issue" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "unlink_issue") {
    await deletePostExternalLink(input.postId, "jira", organizationId);
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
