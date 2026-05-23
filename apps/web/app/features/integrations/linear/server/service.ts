import { requireOrganization } from "@features/auth/server/guards";
import { buildAuthUrl, exchangeCode } from "@services/oauth/flow.server";
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
import {
  getIntegration,
  getIntegrationToken,
  getOrgSlugFromId,
  parseSettings,
} from "../../server/queries";
import {
  createLinearIssue,
  deleteLinearWebhook,
  getLinearIssueById,
  getLinearTeamStates,
  getLinearTeams,
  getLinearWorkspace,
  registerLinearWebhook,
} from "./client";
import { linearOAuth } from "./oauth";
import { LinearActionSchema, type LinearSettings } from "./schemas";

const CALLBACK_PATH = "/api/linear";
const LOG = "[linear-service]";

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
    if (!parsed) {
      console.error(`${LOG} OAuth callback: invalid state param`);
      return redirect("/");
    }

    console.log(`${LOG} OAuth callback started orgId=${parsed.orgId}`);
    const { clientId, clientSecret } = requireLinearEnv();

    try {
      const { accessToken } = await exchangeCode(
        linearOAuth,
        code,
        clientId,
        clientSecret,
        callbackUrl(),
      );
      const workspace = await getLinearWorkspace(accessToken);
      console.log(`${LOG} token exchanged workspaceId=${workspace.id} name="${workspace.name}"`);

      const existing = await getIntegration(parsed.orgId, "linear");
      const existingSettings = parseSettings<LinearSettings>(existing?.settings ?? null);

      // Webhook registration requires a teamId (non-admin accounts cannot use allPublicTeams).
      // It happens in update_settings once the user picks a team.
      // Preserve existing webhook if reconnecting so status sync keeps working.
      const settings: LinearSettings = {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        defaultTeamId: existingSettings?.defaultTeamId,
        autoCreateIssues: existingSettings?.autoCreateIssues ?? false,
        statusMappings: existingSettings?.statusMappings,
        webhookId: existingSettings?.webhookId,
        webhookSecret: existingSettings?.webhookSecret,
      };

      console.log(
        `${LOG} OAuth callback — webhook deferred to team selection (preserving existing: ${!!existingSettings?.webhookId})`,
      );

      console.log(
        `${LOG} saving integration orgId=${parsed.orgId} hasWebhook=${!!settings.webhookId}`,
      );

      const db = getDb();
      await db
        .insert(integrations)
        .values({
          organizationId: parsed.orgId,
          provider: "linear",
          accessToken,
          settings: JSON.stringify(settings),
        })
        .onConflictDoUpdate({
          target: [integrations.organizationId, integrations.provider],
          set: { accessToken, settings: JSON.stringify(settings), updatedAt: new Date() },
        });

      console.log(`${LOG} OAuth callback complete orgId=${parsed.orgId}`);
    } catch (err) {
      console.error(
        `${LOG} OAuth callback failed orgId=${parsed.orgId}:`,
        err instanceof Error ? err.message : err,
      );
    }

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
      return data(
        { error: err instanceof Error ? err.message : "Failed to fetch teams" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "update_settings") {
    console.log(
      `${LOG} update_settings orgId=${organizationId} autoCreate=${input.autoCreateIssues} teamId=${input.defaultTeamId ?? "none"}`,
    );
    const integration = await getIntegration(organizationId, "linear");
    if (!integration?.accessToken) return data({ error: "No Linear integration found" }, { status: 400 });
    const settings = parseSettings<LinearSettings>(integration.settings) ?? ({} as LinearSettings);

    let { webhookId, webhookSecret } = settings;

    const webhookUrl = `${getBaseUrl()}/api/linear/webhook?orgId=${organizationId}`;
    const isLocal = webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1");
    const teamChanged = input.defaultTeamId && input.defaultTeamId !== settings.defaultTeamId;
    const noWebhook = !webhookId;

    if (input.defaultTeamId && !isLocal && (noWebhook || teamChanged)) {
      try {
        if (webhookId) {
          console.log(`${LOG} deleting old webhook webhookId=${webhookId} (team changed)`);
          await deleteLinearWebhook(integration.accessToken, webhookId).catch((err) =>
            console.warn(`${LOG} failed to delete old webhook:`, err),
          );
        }
        const webhook = await registerLinearWebhook(
          integration.accessToken,
          webhookUrl,
          input.defaultTeamId,
        );
        webhookId = webhook.id;
        webhookSecret = webhook.secret;
        console.log(`${LOG} webhook registered webhookId=${webhookId} teamId=${input.defaultTeamId}`);
      } catch (err) {
        console.error(
          `${LOG} webhook registration failed — status sync will NOT work:`,
          err instanceof Error ? err.message : err,
        );
      }
    } else if (isLocal) {
      console.warn(`${LOG} webhook skipped — local URL, status sync will NOT work`);
    }

    await updateIntegrationSettings(
      organizationId,
      "linear",
      {
        ...settings,
        defaultTeamId: input.defaultTeamId,
        autoCreateIssues: input.autoCreateIssues,
        webhookId,
        webhookSecret,
      },
      session.user.id,
    );
    console.log(`${LOG} update_settings done orgId=${organizationId} hasWebhook=${!!webhookId}`);
    return data({ success: true });
  }

  if (input.intent === "disconnect") {
    console.log(`${LOG} disconnect orgId=${organizationId}`);
    const integration = await getIntegration(organizationId, "linear");
    if (integration?.accessToken) {
      const settings = parseSettings<LinearSettings>(integration.settings);
      if (settings?.webhookId) {
        console.log(`${LOG} deleting webhook webhookId=${settings.webhookId}`);
        await deleteLinearWebhook(integration.accessToken, settings.webhookId).catch((err) =>
          console.warn(`${LOG} failed to delete webhook on disconnect:`, err),
        );
      } else {
        console.warn(`${LOG} disconnect — no webhookId in settings, webhook may still exist in Linear`);
      }
    }
    await deleteIntegration(organizationId, "linear");
    console.log(`${LOG} disconnect done orgId=${organizationId}`);
    return data({ success: true });
  }

  if (input.intent === "list_team_states") {
    const accessToken = await getIntegrationToken(organizationId, "linear");
    if (!accessToken) return data({ error: "Linear not connected" }, { status: 400 });
    try {
      const states = await getLinearTeamStates(accessToken, input.teamId);
      return data({ states });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to fetch states" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "create_issue") {
    const [integration, post] = await Promise.all([
      getIntegration(organizationId, "linear"),
      db.query.feedbackPosts.findFirst({
        where: and(
          eq(feedbackPosts.id, input.postId),
          eq(feedbackPosts.organizationId, organizationId),
        ),
        columns: { id: true, title: true, description: true },
      }),
    ]);

    if (!integration?.accessToken) {
      console.error(`${LOG} create_issue — not connected orgId=${organizationId}`);
      return data({ error: "Linear not connected" }, { status: 400 });
    }
    const settings = parseSettings<LinearSettings>(integration.settings);
    const teamId = input.teamId ?? settings?.defaultTeamId;
    if (!teamId) {
      console.error(`${LOG} create_issue — no teamId postId=${input.postId} orgId=${organizationId}`);
      return data(
        { error: "No team selected — set a default team in Linear settings" },
        { status: 400 },
      );
    }
    if (!post) {
      console.error(`${LOG} create_issue — post not found postId=${input.postId}`);
      return data({ error: "Post not found" }, { status: 404 });
    }

    const existingLink = await db.query.postExternalLinks.findFirst({
      where: and(
        eq(postExternalLinks.postId, input.postId),
        eq(postExternalLinks.provider, "linear"),
      ),
      columns: { id: true },
    });
    if (existingLink) {
      console.warn(`${LOG} create_issue — already linked postId=${input.postId}`);
      return data({ error: "Post already linked to a Linear issue" }, { status: 400 });
    }

    console.log(
      `${LOG} create_issue postId=${input.postId} teamId=${teamId} orgId=${organizationId}`,
    );
    try {
      const description = post.description
        ? `${post.description}\n\n---\n*Created from [Feediyo](https://feediyo.com) feedback #${post.id}*`
        : `*Created from [Feediyo](https://feediyo.com) feedback #${post.id}*`;
      const issue = await createLinearIssue(
        integration.accessToken,
        teamId,
        post.title,
        description,
      );
      console.log(
        `${LOG} create_issue done issueId=${issue.id} identifier=${issue.identifier} postId=${input.postId}`,
      );
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
      console.error(
        `${LOG} create_issue failed postId=${input.postId}:`,
        err instanceof Error ? err.message : err,
      );
      return data(
        { error: err instanceof Error ? err.message : "Failed to create Linear issue" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "link_issue") {
    const [integration, post] = await Promise.all([
      getIntegration(organizationId, "linear"),
      db.query.feedbackPosts.findFirst({
        where: and(
          eq(feedbackPosts.id, input.postId),
          eq(feedbackPosts.organizationId, organizationId),
        ),
        columns: { id: true },
      }),
    ]);

    if (!integration?.accessToken) {
      console.error(`${LOG} link_issue — not connected orgId=${organizationId}`);
      return data({ error: "Linear not connected" }, { status: 400 });
    }
    if (!post) {
      console.error(`${LOG} link_issue — post not found postId=${input.postId}`);
      return data({ error: "Post not found" }, { status: 404 });
    }

    console.log(
      `${LOG} link_issue postId=${input.postId} issueId=${input.issueId} orgId=${organizationId}`,
    );
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
      console.log(
        `${LOG} link_issue done issueId=${issue.id} identifier=${issue.identifier} postId=${input.postId}`,
      );
      return data({ success: true, issue });
    } catch (err) {
      console.error(
        `${LOG} link_issue failed postId=${input.postId} issueId=${input.issueId}:`,
        err instanceof Error ? err.message : err,
      );
      return data(
        { error: err instanceof Error ? err.message : "Failed to link Linear issue" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "unlink_issue") {
    console.log(`${LOG} unlink_issue postId=${input.postId} orgId=${organizationId}`);
    await deletePostExternalLink(input.postId, "linear", organizationId);
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
