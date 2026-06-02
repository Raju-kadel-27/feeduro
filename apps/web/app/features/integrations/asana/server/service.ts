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
  createAsanaTask,
  deleteAsanaWebhook,
  getAsanaProjects,
  getAsanaSections,
  getAsanaTaskByGid,
  getAsanaWorkspaces,
  parseAsanaTaskInput,
  registerAsanaWebhook,
  searchAsanaTasks,
} from "./client";
import { asanaOAuth } from "./oauth";
import { AsanaActionSchema, type AsanaSettings } from "./schemas";

const CALLBACK_PATH = "/api/asana";

function callbackUrl(): string {
  return `${getBaseUrl()}${CALLBACK_PATH}`;
}

function requireAsanaEnv() {
  const env = getEnv();
  if (!env.ASANA_CLIENT_ID || !env.ASANA_CLIENT_SECRET) {
    throw new Response("Asana OAuth not configured", { status: 501 });
  }
  return { clientId: env.ASANA_CLIENT_ID, clientSecret: env.ASANA_CLIENT_SECRET };
}

const RECONNECT_MSG = "Asana session expired — please reconnect Asana in Settings → Integrations";

// Retries fn once after refreshing the access token on a 401 error.
async function withTokenRefresh<T>(
  organizationId: string,
  fn: (token: string) => Promise<T>,
): Promise<T> {
  const db = getDb();
  const integration = await getIntegration(organizationId, "asana");
  if (!integration?.accessToken) throw new Error("Asana not connected");

  try {
    return await fn(integration.accessToken);
  } catch (err) {
    if (!(err instanceof Error && err.message.includes("401"))) throw err;

    if (!integration.refreshToken) throw new Error(RECONNECT_MSG);

    const env = getEnv();
    if (!env.ASANA_CLIENT_ID || !env.ASANA_CLIENT_SECRET) throw new Error(RECONNECT_MSG);

    try {
      const { accessToken: newToken, refreshToken: newRefresh } = await refreshAccessToken(
        asanaOAuth,
        integration.refreshToken,
        env.ASANA_CLIENT_ID,
        env.ASANA_CLIENT_SECRET,
      );
      await db
        .update(integrations)
        .set({
          accessToken: newToken,
          refreshToken: newRefresh ?? integration.refreshToken,
          updatedAt: new Date(),
        })
        .where(
          and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "asana")),
        );
      return await fn(newToken);
    } catch {
      throw new Error(RECONNECT_MSG);
    }
  }
}

// ─── Loader ──────────────────────────────────────────────────────────────────

export async function handleAsanaLoader(request: Request) {
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (intent === "connect") {
    const { organizationId } = await requireOrganization(request);
    const { clientId } = requireAsanaEnv();
    const oauthState = buildOAuthState(organizationId);
    return redirect(buildAuthUrl(asanaOAuth, clientId, callbackUrl(), oauthState));
  }

  if (error) return redirect("/");

  if (code && state) {
    const parsed = parseOAuthState(state);
    if (!parsed) return redirect("/");

    const { clientId, clientSecret } = requireAsanaEnv();

    try {
      const { accessToken, refreshToken } = await exchangeCode(
        asanaOAuth,
        code,
        clientId,
        clientSecret,
        callbackUrl(),
      );
      const workspaces = await getAsanaWorkspaces(accessToken);
      if (!workspaces.length) throw new Error("No accessible Asana workspaces");

      const existing = await getIntegration(parsed.orgId, "asana");
      const existingSettings = parseSettings<AsanaSettings>(existing?.settings ?? null);

      const primaryWorkspace = workspaces[0];
      const workspaceGid = existingSettings?.workspaceGid ?? primaryWorkspace.gid;
      const selectedWorkspace = workspaces.find((w) => w.gid === workspaceGid) ?? primaryWorkspace;

      if (existing?.accessToken && existingSettings?.webhookGid) {
        await deleteAsanaWebhook(existing.accessToken, existingSettings.webhookGid).catch(() => {});
      }

      let webhookGid: string | undefined;
      const webhookUrl = `${getBaseUrl()}/api/asana/webhook?orgId=${parsed.orgId}`;
      const isLocal = webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1");

      if (!isLocal) {
        try {
          webhookGid = await registerAsanaWebhook(accessToken, selectedWorkspace.gid, webhookUrl);
        } catch {
          /* Non-fatal — status sync disabled */
        }
      }

      const settings: AsanaSettings = {
        workspaceGid: selectedWorkspace.gid,
        workspaceName: selectedWorkspace.name,
        defaultProjectGid: existingSettings?.defaultProjectGid,
        defaultProjectName: existingSettings?.defaultProjectName,
        autoCreateIssues: existingSettings?.autoCreateIssues ?? false,
        statusMappings: existingSettings?.statusMappings,
        webhookGid,
        webhookSecret: existingSettings?.webhookSecret,
      };

      const db = getDb();
      await db
        .insert(integrations)
        .values({
          organizationId: parsed.orgId,
          provider: "asana",
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
    return redirect(orgSlug ? `/${orgSlug}/settings/integrations/asana` : "/");
  }

  return data({});
}

// ─── Action ──────────────────────────────────────────────────────────────────

export async function handleAsanaAction(request: Request) {
  const { session, organizationId } = await requireOrganization(request);
  await requireAdminRole(organizationId, session.user.id);

  const body = await request.json();
  const parsed = AsanaActionSchema.safeParse(body);
  if (!parsed.success) {
    return data({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const input = parsed.data;
  const db = getDb();

  if (input.intent === "list_projects") {
    try {
      const integration = await getIntegration(organizationId, "asana");
      const settings = parseSettings<AsanaSettings>(integration?.settings ?? null);
      if (!settings?.workspaceGid) return data({ error: "No Asana workspace" }, { status: 400 });
      const workspaceGid = settings.workspaceGid;
      const projects = await withTokenRefresh(organizationId, (token) =>
        getAsanaProjects(token, workspaceGid),
      );
      return data({ projects });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to fetch projects" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "list_sections") {
    try {
      const sections = await withTokenRefresh(organizationId, (token) =>
        getAsanaSections(token, input.projectGid),
      );
      return data({ sections });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to fetch sections" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "update_settings") {
    const integration = await getIntegration(organizationId, "asana");
    if (!integration) return data({ error: "No Asana integration found" }, { status: 400 });
    const settings = parseSettings<AsanaSettings>(integration.settings) ?? ({} as AsanaSettings);
    await updateIntegrationSettings(
      organizationId,
      "asana",
      {
        ...settings,
        defaultProjectGid: input.defaultProjectGid ?? settings.defaultProjectGid,
        defaultProjectName: input.defaultProjectName ?? settings.defaultProjectName,
        autoCreateIssues: input.autoCreateIssues,
        statusMappings: input.statusMappings ?? settings.statusMappings,
      },
      session.user.id,
    );
    return data({ success: true });
  }

  if (input.intent === "disconnect") {
    const integration = await getIntegration(organizationId, "asana");
    if (integration?.accessToken) {
      const settings = parseSettings<AsanaSettings>(integration.settings);
      if (settings?.webhookGid) {
        await deleteAsanaWebhook(integration.accessToken, settings.webhookGid).catch(() => {});
      }
    }
    await deleteIntegration(organizationId, "asana");
    return data({ success: true });
  }

  if (input.intent === "create_task") {
    const [integration, post] = await Promise.all([
      getIntegration(organizationId, "asana"),
      db.query.feedbackPosts.findFirst({
        where: and(
          eq(feedbackPosts.id, input.postId),
          eq(feedbackPosts.organizationId, organizationId),
        ),
        columns: { id: true, title: true, description: true },
      }),
    ]);

    if (!integration?.accessToken) return data({ error: "Asana not connected" }, { status: 400 });
    const settings = parseSettings<AsanaSettings>(integration.settings);
    if (!settings?.workspaceGid) return data({ error: "No Asana workspace" }, { status: 400 });
    if (!settings.defaultProjectGid) {
      return data(
        { error: "No project selected — set a default project in Asana settings" },
        { status: 400 },
      );
    }
    if (!post) return data({ error: "Post not found" }, { status: 404 });

    const existingLink = await db.query.postExternalLinks.findFirst({
      where: and(
        eq(postExternalLinks.postId, input.postId),
        eq(postExternalLinks.provider, "asana"),
      ),
      columns: { id: true },
    });
    if (existingLink)
      return data({ error: "Post already linked to an Asana task" }, { status: 400 });

    try {
      const { workspaceGid, defaultProjectGid } = settings;
      const baseName = input.name ?? post.title;
      const notes = input.notes ?? (post.description
        ? `${post.description}\n\nCreated from Feediyo feedback #${post.id}`
        : `Created from Feediyo feedback #${post.id}`);
      const task = await withTokenRefresh(organizationId, (token) =>
        createAsanaTask(token, workspaceGid, defaultProjectGid, baseName, notes),
      );
      await insertPostExternalLink({
        postId: input.postId,
        organizationId,
        provider: "asana",
        externalId: task.gid,
        externalUrl: task.url,
        identifier: task.gid,
        externalTitle: task.name,
        externalStatus: task.completed ? "Completed" : (task.sectionName ?? ""),
        linkedByUserId: session.user.id,
      });
      return data({ success: true, task });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to create Asana task" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "link_task") {
    const taskGid = parseAsanaTaskInput(input.taskInput);

    const [integration, post] = await Promise.all([
      getIntegration(organizationId, "asana"),
      db.query.feedbackPosts.findFirst({
        where: and(
          eq(feedbackPosts.id, input.postId),
          eq(feedbackPosts.organizationId, organizationId),
        ),
        columns: { id: true },
      }),
    ]);

    if (!integration?.accessToken) return data({ error: "Asana not connected" }, { status: 400 });
    if (!post) return data({ error: "Post not found" }, { status: 404 });
    const settings = parseSettings<AsanaSettings>(integration.settings);
    if (!settings?.workspaceGid) return data({ error: "No Asana workspace" }, { status: 400 });

    try {
      const task = await withTokenRefresh(organizationId, (token) =>
        getAsanaTaskByGid(token, settings.workspaceGid!, taskGid),
      );
      await upsertPostExternalLink({
        postId: input.postId,
        organizationId,
        provider: "asana",
        externalId: task.gid,
        externalUrl: task.url,
        identifier: task.gid,
        externalTitle: task.name,
        externalStatus: task.completed ? "Completed" : (task.sectionName ?? ""),
        linkedByUserId: session.user.id,
      });
      return data({ success: true, task });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to link Asana task" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "unlink_task") {
    await deletePostExternalLink(input.postId, "asana", organizationId);
    return data({ success: true });
  }

  if (input.intent === "search_tasks") {
    try {
      const integration = await getIntegration(organizationId, "asana");
      const settings = parseSettings<AsanaSettings>(integration?.settings ?? null);
      if (!integration?.accessToken || !settings?.workspaceGid)
        return data({ error: "Asana not connected" }, { status: 400 });
      const tasks = await withTokenRefresh(organizationId, (token) =>
        searchAsanaTasks(token, settings.workspaceGid!, input.query),
      );
      return data({ results: tasks.map((t) => ({ id: t.gid, identifier: t.gid, title: t.name, status: t.completed ? "Completed" : (t.sectionName ?? ""), url: t.url })) });
    } catch (err) {
      return data({ error: err instanceof Error ? err.message : "Search failed" }, { status: 400 });
    }
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
