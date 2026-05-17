import { buildAuthUrl, exchangeCode } from "@services/oauth/flow.server";
import { buildOAuthState, parseOAuthState } from "@services/oauth/state.server";
import {
  deleteLinearWebhook,
  createLinearIssue,
  getLinearIssueById,
  getLinearTeamStates,
  getLinearTeams,
  getLinearWorkspace,
  registerLinearWebhook,
} from "./client";
import { linearOAuth } from "./oauth";
import { LinearActionSchema, type LinearSettings } from "./schemas";
import { requireOrganization } from "@features/auth/server/guards";
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
  upsertPostExternalLink,
  updateIntegrationSettings,
} from "../../server/mutations";
import { requireAdminRole } from "../../server/permissions";
import { getIntegration, getIntegrationToken, getOrgSlugFromId, parseSettings } from "../../server/queries";

const CALLBACK_PATH = "/api/linear";

function callbackUrl(): string {
  return `${getBaseUrl()}${CALLBACK_PATH}`;
}

function requireLinearEnv() {
  const env = getEnv();
  if (!env.LINEAR_CLIENT_ID || !env.LINEAR_CLIENT_SECRET) {
    throw new Response("Linear OAuth not configured", { status: 501 });
  }
  return { clientId: env.LINEAR_CLIENT_ID, clientSecret: env.LINEAR_CLIENT_SECRET };
}

// ─── Loader ──────────────────────────────────────────────────────────────────

export async function handleLinearLoader(request: Request) {
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (intent === "connect") {
    const { organizationId } = await requireOrganization(request);
    const { clientId } = requireLinearEnv();
    const oauthState = buildOAuthState(organizationId);
    return redirect(buildAuthUrl(linearOAuth, clientId, callbackUrl(), oauthState));
  }

  if (error) return redirect("/");

  if (code && state) {
    const parsed = parseOAuthState(state);
    if (!parsed) return redirect("/");

    const { clientId, clientSecret } = requireLinearEnv();

    try {
      const { accessToken } = await exchangeCode(linearOAuth, code, clientId, clientSecret, callbackUrl());
      const workspace = await getLinearWorkspace(accessToken);

      const existing = await getIntegration(parsed.orgId, "linear");
      const existingSettings = parseSettings<LinearSettings>(existing?.settings ?? null);

      const webhookUrl = `${getBaseUrl()}/api/linear/webhook?orgId=${parsed.orgId}`;
      const isLocal = webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1");

      let webhookId = existingSettings?.webhookId;
      let webhookSecret = existingSettings?.webhookSecret;

      if (!isLocal) {
        try {
          if (existingSettings?.webhookId) {
            await deleteLinearWebhook(accessToken, existingSettings.webhookId).catch(() => {});
          }
          const webhook = await registerLinearWebhook(accessToken, webhookUrl);
          webhookId = webhook.id;
          webhookSecret = webhook.secret;
        } catch { /* Non-fatal — integration works, just no auto-sync */ }
      }

      const settings: LinearSettings = {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        defaultTeamId: existingSettings?.defaultTeamId,
        autoCreateIssues: existingSettings?.autoCreateIssues ?? false,
        statusMappings: existingSettings?.statusMappings,
        webhookId,
        webhookSecret,
      };

      const db = getDb();
      await db
        .insert(integrations)
        .values({ organizationId: parsed.orgId, provider: "linear", accessToken, settings: JSON.stringify(settings) })
        .onConflictDoUpdate({
          target: [integrations.organizationId, integrations.provider],
          set: { accessToken, settings: JSON.stringify(settings), updatedAt: new Date() },
        });
    } catch { /* Redirect even on error — UI will show "not connected" */ }

    const orgSlug = await getOrgSlugFromId(parsed.orgId);
    return redirect(orgSlug ? `/${orgSlug}/settings/integrations/linear` : "/");
  }

  return data({});
}

// ─── Action ──────────────────────────────────────────────────────────────────

export async function handleLinearAction(request: Request) {
  const { session, organizationId } = await requireOrganization(request);
  await requireAdminRole(organizationId, session.user.id);

  const body = await request.json();
  const parsed = LinearActionSchema.safeParse(body);
  if (!parsed.success) {
    return data({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const input = parsed.data;
  const db = getDb();

  if (input.intent === "list_teams") {
    const accessToken = await getIntegrationToken(organizationId, "linear");
    if (!accessToken) return data({ error: "Linear not connected" }, { status: 400 });
    try {
      const teams = await getLinearTeams(accessToken);
      return data({ teams });
    } catch (err) {
      return data({ error: err instanceof Error ? err.message : "Failed to fetch teams" }, { status: 400 });
    }
  }

  if (input.intent === "update_settings") {
    const integration = await getIntegration(organizationId, "linear");
    if (!integration) return data({ error: "No Linear integration found" }, { status: 400 });
    const settings = parseSettings<LinearSettings>(integration.settings) ?? ({} as LinearSettings);
    await updateIntegrationSettings(organizationId, "linear", {
      ...settings,
      defaultTeamId: input.defaultTeamId,
      autoCreateIssues: input.autoCreateIssues,
    }, session.user.id);
    return data({ success: true });
  }

  if (input.intent === "disconnect") {
    const integration = await getIntegration(organizationId, "linear");
    if (integration?.accessToken) {
      const settings = parseSettings<LinearSettings>(integration.settings);
      if (settings?.webhookId) {
        await deleteLinearWebhook(integration.accessToken, settings.webhookId).catch(() => {});
      }
    }
    await deleteIntegration(organizationId, "linear");
    return data({ success: true });
  }

  if (input.intent === "list_team_states") {
    const accessToken = await getIntegrationToken(organizationId, "linear");
    if (!accessToken) return data({ error: "Linear not connected" }, { status: 400 });
    try {
      const states = await getLinearTeamStates(accessToken, input.teamId);
      return data({ states });
    } catch (err) {
      return data({ error: err instanceof Error ? err.message : "Failed to fetch states" }, { status: 400 });
    }
  }

  if (input.intent === "create_issue") {
    const [integration, post] = await Promise.all([
      getIntegration(organizationId, "linear"),
      db.query.feedbackPosts.findFirst({
        where: and(eq(feedbackPosts.id, input.postId), eq(feedbackPosts.organizationId, organizationId)),
        columns: { id: true, title: true, description: true },
      }),
    ]);

    if (!integration?.accessToken) return data({ error: "Linear not connected" }, { status: 400 });
    const settings = parseSettings<LinearSettings>(integration.settings);
    const teamId = input.teamId ?? settings?.defaultTeamId;
    if (!teamId) return data({ error: "No team selected — set a default team in Linear settings" }, { status: 400 });
    if (!post) return data({ error: "Post not found" }, { status: 404 });

    const existingLink = await db.query.postExternalLinks.findFirst({
      where: and(eq(postExternalLinks.postId, input.postId), eq(postExternalLinks.provider, "linear")),
      columns: { id: true },
    });
    if (existingLink) return data({ error: "Post already linked to a Linear issue" }, { status: 400 });

    try {
      const description = post.description
        ? `${post.description}\n\n---\n*Created from [Feediyo](https://feediyo.com) feedback #${post.id}*`
        : `*Created from [Feediyo](https://feediyo.com) feedback #${post.id}*`;
      const issue = await createLinearIssue(integration.accessToken, teamId, post.title, description);
      await insertPostExternalLink({
        postId: input.postId,
        organizationId,
        provider: "linear",
        externalId: issue.id,
        externalUrl: issue.url,
        identifier: issue.identifier,
        externalTitle: issue.title,
        externalStatus: issue.state.name,
        linkedByUserId: session.user.id,
      });
      return data({ success: true, issue });
    } catch (err) {
      return data({ error: err instanceof Error ? err.message : "Failed to create Linear issue" }, { status: 400 });
    }
  }

  if (input.intent === "link_issue") {
    const [integration, post] = await Promise.all([
      getIntegration(organizationId, "linear"),
      db.query.feedbackPosts.findFirst({
        where: and(eq(feedbackPosts.id, input.postId), eq(feedbackPosts.organizationId, organizationId)),
        columns: { id: true },
      }),
    ]);

    if (!integration?.accessToken) return data({ error: "Linear not connected" }, { status: 400 });
    if (!post) return data({ error: "Post not found" }, { status: 404 });

    try {
      const issue = await getLinearIssueById(integration.accessToken, input.issueId);
      await upsertPostExternalLink({
        postId: input.postId,
        organizationId,
        provider: "linear",
        externalId: issue.id,
        externalUrl: issue.url,
        identifier: issue.identifier,
        externalTitle: issue.title,
        externalStatus: issue.state.name,
        linkedByUserId: session.user.id,
      });
      return data({ success: true, issue });
    } catch (err) {
      return data({ error: err instanceof Error ? err.message : "Failed to link Linear issue" }, { status: 400 });
    }
  }

  if (input.intent === "unlink_issue") {
    await deletePostExternalLink(input.postId, "linear", organizationId);
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
