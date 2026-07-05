import { requireOrganization } from "@features/auth/server/guards";
import { buildAuthUrl, exchangeCode } from "@services/oauth/flow.server";
import { buildOAuthState, parseOAuthState } from "@services/oauth/state.server";
import { getBaseUrl } from "@utils/base-url";
import { getEnv } from "@utils/get-env";
import { and, eq } from "drizzle-orm";
import { data, redirect } from "react-router";
import type { Db } from "@/db";
import { feedbackPosts, postExternalLinks } from "@/db/schema";
import {
  deleteIntegration,
  deletePostExternalLink,
  insertPostExternalLink,
  updateIntegrationSettings,
  upsertIntegrationToken,
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
  createGithubIssue,
  deleteGithubWebhook,
  getGithubIssueByUrl,
  listGithubRepos,
  registerGithubWebhook,
} from "./client";
import { githubOAuth } from "./oauth";
import type { GithubSettings } from "./schemas";
import { GithubActionSchema } from "./schemas";

const CALLBACK_PATH = "/api/github";

function callbackUrl(): string {
  return `${getBaseUrl()}${CALLBACK_PATH}`;
}

function requireGithubEnv() {
  const env = getEnv();
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw new Response("GitHub OAuth not configured", { status: 501 });
  }
  return { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET };
}

// ─── Loader ──────────────────────────────────────────────────────────────────

export async function handleGithubLoader(db: Db, request: Request) {
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (intent === "connect") {
    const { organizationId } = await requireOrganization(db, request);
    const { clientId } = requireGithubEnv();
    const oauthState = buildOAuthState(organizationId);
    return redirect(buildAuthUrl(githubOAuth, clientId, callbackUrl(), oauthState));
  }

  if (error) return redirect("/");

  if (code && state) {
    const parsed = parseOAuthState(state);
    if (!parsed) return redirect("/");

    const { clientId, clientSecret } = requireGithubEnv();

    try {
      const { accessToken } = await exchangeCode(
        githubOAuth,
        code,
        clientId,
        clientSecret,
        callbackUrl(),
      );
      const defaultSettings: GithubSettings = {
        repoOwner: "",
        repoName: "",
        autoCreateIssues: false,
      };
      await upsertIntegrationToken(
        db,
        parsed.orgId,
        "github",
        accessToken,
        JSON.stringify(defaultSettings),
      );
    } catch {
      // Redirect even on error — the UI will show "not connected"
    }

    const orgSlug = await getOrgSlugFromId(db, parsed.orgId);
    return redirect(orgSlug ? `/${orgSlug}/settings/integrations/github` : "/");
  }

  // Normal data load (settings page)
  const { organizationId } = await requireOrganization(db, request);
  const integration = await getIntegration(db, organizationId, "github");
  const settings = parseSettings<GithubSettings>(integration?.settings ?? null);

  return data({
    integration: integration
      ? {
          repoOwner: settings?.repoOwner ?? "",
          repoName: settings?.repoName ?? "",
          autoCreateIssues: settings?.autoCreateIssues ?? false,
        }
      : null,
    githubConnected: !!integration?.accessToken,
  });
}

// ─── Action ──────────────────────────────────────────────────────────────────

export async function handleGithubAction(db: Db, request: Request) {
  const { session, organizationId } = await requireOrganization(db, request);
  await requireAdminRole(db, organizationId, session.user.id);

  const body = await request.json();
  const parsed = GithubActionSchema.safeParse(body);
  if (!parsed.success) {
    return data({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const input = parsed.data;

  if (input.intent === "list_repos") {
    const accessToken = await getIntegrationToken(db, organizationId, "github");
    if (!accessToken) return data({ error: "GitHub account not connected" }, { status: 400 });
    try {
      const repos = await listGithubRepos(accessToken);
      return data({ repos });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to fetch repos" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "save_repo") {
    const integration = await getIntegration(db, organizationId, "github");
    if (!integration?.accessToken) return data({ error: "Connect GitHub first" }, { status: 400 });

    const existing = parseSettings<GithubSettings>(integration.settings);
    const webhookUrl = `${getBaseUrl()}/api/github/webhook?orgId=${organizationId}`;
    const isLocal = webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1");

    let webhookId = existing?.webhookId;
    let webhookSecret = existing?.webhookSecret;

    if (!isLocal) {
      try {
        if (webhookId && existing?.repoOwner && existing?.repoName) {
          await deleteGithubWebhook(
            integration.accessToken,
            existing.repoOwner,
            existing.repoName,
            webhookId,
          ).catch(() => {});
        }
        const secret = crypto.randomUUID().replace(/-/g, "");
        const hook = await registerGithubWebhook(
          integration.accessToken,
          input.repoOwner,
          input.repoName,
          webhookUrl,
          secret,
        );
        webhookId = String(hook.id);
        webhookSecret = secret;
      } catch (err) {
        console.error(
          "[github] webhook registration failed:",
          err instanceof Error ? err.message : err,
        );
      }
    }

    const settings: GithubSettings = {
      repoOwner: input.repoOwner,
      repoName: input.repoName,
      autoCreateIssues: input.autoCreateIssues,
      webhookId,
      webhookSecret,
    };
    await updateIntegrationSettings(db, organizationId, "github", settings, session.user.id);
    return data({ success: true });
  }

  if (input.intent === "toggle_auto_create") {
    const integration = await getIntegration(db, organizationId, "github");
    if (!integration) return data({ error: "No GitHub integration found" }, { status: 400 });
    const existing = parseSettings<GithubSettings>(integration.settings) ?? ({} as GithubSettings);
    await updateIntegrationSettings(db, organizationId, "github", {
      ...existing,
      autoCreateIssues: input.enabled,
    });
    return data({ success: true });
  }

  if (input.intent === "disconnect") {
    const integration = await getIntegration(db, organizationId, "github");
    const existing = parseSettings<GithubSettings>(integration?.settings ?? null);
    if (
      integration?.accessToken &&
      existing?.webhookId &&
      existing.repoOwner &&
      existing.repoName
    ) {
      await deleteGithubWebhook(
        integration.accessToken,
        existing.repoOwner,
        existing.repoName,
        existing.webhookId,
      ).catch(() => {});
    }
    await deleteIntegration(db, organizationId, "github");
    return data({ success: true });
  }

  if (input.intent === "create_issue") {
    const [integration, post] = await Promise.all([
      getIntegration(db, organizationId, "github"),
      db.query.feedbackPosts.findFirst({
        where: and(
          eq(feedbackPosts.id, input.postId),
          eq(feedbackPosts.organizationId, organizationId),
        ),
        columns: { id: true, title: true, description: true },
      }),
    ]);

    if (!integration?.accessToken) return data({ error: "GitHub not connected" }, { status: 400 });
    const settings = parseSettings<GithubSettings>(integration.settings);
    if (!settings?.repoOwner || !settings?.repoName) {
      return data({ error: "GitHub repository not configured" }, { status: 400 });
    }
    if (!post) return data({ error: "Post not found" }, { status: 404 });

    const existingLink = await db.query.postExternalLinks.findFirst({
      where: and(
        eq(postExternalLinks.postId, input.postId),
        eq(postExternalLinks.provider, "github"),
      ),
      columns: { id: true },
    });
    if (existingLink) {
      return data({ error: "Post already linked to a GitHub issue" }, { status: 400 });
    }

    try {
      const bodyText = post.description
        ? `${post.description}\n\n---\n*Created from [Feeduro](https://feeduro.com) feedback #${post.id}*`
        : `*Created from [Feeduro](https://feeduro.com) feedback #${post.id}*`;

      const issue = await createGithubIssue(
        integration.accessToken,
        settings.repoOwner,
        settings.repoName,
        post.title,
        bodyText,
      );
      await insertPostExternalLink(db, {
        postId: input.postId,
        organizationId,
        provider: "github",
        externalId: String(issue.number),
        externalUrl: issue.html_url,
        identifier: `#${issue.number}`,
        externalTitle: issue.title,
        externalStatus: issue.state,
        linkedByUserId: session.user.id,
        metadata: JSON.stringify({ issueNumber: issue.number }),
      });
      return data({ success: true, issue });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to create issue" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "link_issue") {
    const [integration, post] = await Promise.all([
      getIntegration(db, organizationId, "github"),
      db.query.feedbackPosts.findFirst({
        where: and(
          eq(feedbackPosts.id, input.postId),
          eq(feedbackPosts.organizationId, organizationId),
        ),
        columns: { id: true, title: true },
      }),
    ]);

    if (!integration?.accessToken) return data({ error: "GitHub not connected" }, { status: 400 });
    if (!post) return data({ error: "Post not found" }, { status: 404 });

    try {
      const issue = await getGithubIssueByUrl(integration.accessToken, input.issueUrl);
      await upsertPostExternalLink(db, {
        postId: input.postId,
        organizationId,
        provider: "github",
        externalId: String(issue.number),
        externalUrl: issue.html_url,
        identifier: `#${issue.number}`,
        externalTitle: issue.title,
        externalStatus: issue.state,
        linkedByUserId: session.user.id,
        metadata: JSON.stringify({ issueNumber: issue.number }),
      });
      return data({ success: true, issue });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to link issue" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "unlink_issue") {
    await deletePostExternalLink(db, input.postId, "github", organizationId);
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
