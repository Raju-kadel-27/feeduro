import { requireOrganization } from "@features/auth/server/guards";
import {
  createNotionPage,
  getNotionDatabases,
  getNotionPage,
  parseNotionPageInput,
} from "@features/integrations/notion/server/client";
import { exchangeNotionCode, notionAuthUrl } from "@features/integrations/notion/server/oauth";
import type { NotionSettings } from "@features/integrations/notion/server/schemas";
import {
  getIntegration,
  getOrgSlugFromId,
  parseSettings,
} from "@features/integrations/server/queries";
import { isAdmin } from "@features/roles/server/queries";
import { buildOAuthState, parseOAuthState } from "@services/oauth/state.server";
import { getBaseUrl } from "@utils/base-url";
import { getEnv } from "@utils/get-env";
import { and, eq } from "drizzle-orm";
import { data, redirect } from "react-router";
import { z } from "zod";
import { getDb } from "@/db";
import { feedbackPosts, integrations, member, postExternalLinks } from "@/db/schema";
import type { Route } from "./+types/notion";

const CALLBACK_PATH = "/api/notion";

function callbackUrl() {
  return `${getBaseUrl()}${CALLBACK_PATH}`;
}

// GET /api/notion?intent=connect → initiates OAuth
// GET /api/notion?code=...&state=... → OAuth callback from Notion
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (intent === "connect") {
    const { organizationId } = await requireOrganization(request);
    const env = getEnv();
    if (!env.NOTION_CLIENT_ID || !env.NOTION_CLIENT_SECRET) {
      throw new Response("Notion OAuth not configured", { status: 501 });
    }
    const oauthState = buildOAuthState(organizationId);
    return redirect(notionAuthUrl(env.NOTION_CLIENT_ID, callbackUrl(), oauthState));
  }

  if (error) return redirect("/");

  if (code && state) {
    const parsed = parseOAuthState(state);
    if (!parsed) return redirect("/");

    const env = getEnv();
    if (!env.NOTION_CLIENT_ID || !env.NOTION_CLIENT_SECRET) return redirect("/");

    try {
      const { accessToken, workspaceId, workspaceName } = await exchangeNotionCode(
        code,
        env.NOTION_CLIENT_ID,
        env.NOTION_CLIENT_SECRET,
        callbackUrl(),
      );

      const existing = await getIntegration(parsed.orgId, "notion");
      const existingSettings = parseSettings<NotionSettings>(existing?.settings ?? null);

      const settings: NotionSettings = {
        workspaceId,
        workspaceName,
        defaultDatabaseId: existingSettings?.defaultDatabaseId,
        defaultDatabaseName: existingSettings?.defaultDatabaseName,
        autoCreatePages: existingSettings?.autoCreatePages ?? false,
      };

      const db = getDb();
      await db
        .insert(integrations)
        .values({
          organizationId: parsed.orgId,
          provider: "notion",
          accessToken,
          settings: JSON.stringify(settings),
        })
        .onConflictDoUpdate({
          target: [integrations.organizationId, integrations.provider],
          set: { accessToken, settings: JSON.stringify(settings), updatedAt: new Date() },
        });
    } catch {
      /* Redirect even on error — UI shows "not connected" */
    }

    const orgSlug = await getOrgSlugFromId(parsed.orgId);
    return redirect(orgSlug ? `/${orgSlug}/settings/integrations/notion` : "/");
  }

  return data({});
}

const actionSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("list_databases") }),
  z.object({
    intent: z.literal("update_settings"),
    defaultDatabaseId: z.string().optional(),
    defaultDatabaseName: z.string().optional(),
    autoCreatePages: z.boolean(),
  }),
  z.object({ intent: z.literal("disconnect") }),
  z.object({ intent: z.literal("create_page"), postId: z.string().min(1) }),
  z.object({
    intent: z.literal("link_page"),
    postId: z.string().min(1),
    pageInput: z.string().min(1),
  }),
  z.object({ intent: z.literal("unlink_page"), postId: z.string().min(1) }),
]);

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);

  if (!(await isAdmin(organizationId, session.user.id)))
    return data({ error: "Only admins can manage Notion integration" }, { status: 403 });

  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success)
    return data({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

  const body = parsed.data;
  const db = getDb();

  if (body.intent === "list_databases") {
    const integration = await getIntegration(organizationId, "notion");
    if (!integration?.accessToken) return data({ error: "Notion not connected" }, { status: 400 });
    try {
      const databases = await getNotionDatabases(integration.accessToken);
      return data({ databases });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to fetch databases" },
        { status: 400 },
      );
    }
  }

  if (body.intent === "update_settings") {
    const integration = await getIntegration(organizationId, "notion");
    if (!integration) return data({ error: "No Notion integration found" }, { status: 400 });
    const settings = parseSettings<NotionSettings>(integration.settings) ?? ({} as NotionSettings);
    const updated: NotionSettings = {
      ...settings,
      defaultDatabaseId: body.defaultDatabaseId ?? settings.defaultDatabaseId,
      defaultDatabaseName: body.defaultDatabaseName ?? settings.defaultDatabaseName,
      autoCreatePages: body.autoCreatePages,
    };
    await db
      .update(integrations)
      .set({ settings: JSON.stringify(updated), connectedByUserId: session.user.id })
      .where(
        and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "notion")),
      );
    return data({ success: true });
  }

  if (body.intent === "disconnect") {
    await db
      .delete(integrations)
      .where(
        and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "notion")),
      );
    return data({ success: true });
  }

  if (body.intent === "create_page") {
    const { postId } = body;
    const [integration, post] = await Promise.all([
      getIntegration(organizationId, "notion"),
      db.query.feedbackPosts.findFirst({
        where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
        columns: { id: true, title: true, description: true },
      }),
    ]);
    if (!integration?.accessToken) return data({ error: "Notion not connected" }, { status: 400 });
    const settings = parseSettings<NotionSettings>(integration.settings);
    if (!settings?.defaultDatabaseId)
      return data(
        { error: "No database selected — set a default database in Notion settings" },
        { status: 400 },
      );
    if (!post) return data({ error: "Post not found" }, { status: 404 });

    const existingLink = await db.query.postExternalLinks.findFirst({
      where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "notion")),
      columns: { id: true },
    });
    if (existingLink)
      return data({ error: "Post already linked to a Notion page" }, { status: 400 });

    try {
      const content = post.description
        ? `${post.description}\n\nCreated from Feeduro feedback #${post.id}`
        : `Created from Feeduro feedback #${post.id}`;
      const page = await createNotionPage(
        integration.accessToken,
        settings.defaultDatabaseId,
        post.title,
        content,
      );
      await db.insert(postExternalLinks).values({
        postId,
        organizationId,
        provider: "notion",
        externalId: page.id,
        externalUrl: page.url,
        identifier: page.id.slice(0, 8),
        externalTitle: page.title,
        linkedByUserId: session.user.id,
        lastSyncedAt: new Date(),
      });
      return data({ success: true, page });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to create Notion page" },
        { status: 400 },
      );
    }
  }

  if (body.intent === "link_page") {
    const { postId, pageInput } = body;
    const pageId = parseNotionPageInput(pageInput);

    const [integration, post] = await Promise.all([
      getIntegration(organizationId, "notion"),
      db.query.feedbackPosts.findFirst({
        where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
        columns: { id: true },
      }),
    ]);
    if (!integration?.accessToken) return data({ error: "Notion not connected" }, { status: 400 });
    if (!post) return data({ error: "Post not found" }, { status: 404 });

    try {
      const page = await getNotionPage(integration.accessToken, pageId);
      await db
        .insert(postExternalLinks)
        .values({
          postId,
          organizationId,
          provider: "notion",
          externalId: page.id,
          externalUrl: page.url,
          identifier: page.id.slice(0, 8),
          externalTitle: page.title,
          linkedByUserId: session.user.id,
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [postExternalLinks.postId, postExternalLinks.provider],
          set: {
            externalId: page.id,
            externalUrl: page.url,
            identifier: page.id.slice(0, 8),
            externalTitle: page.title,
            lastSyncedAt: new Date(),
          },
        });
      return data({ success: true, page });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to link Notion page" },
        { status: 400 },
      );
    }
  }

  if (body.intent === "unlink_page") {
    await db
      .delete(postExternalLinks)
      .where(
        and(
          eq(postExternalLinks.postId, body.postId),
          eq(postExternalLinks.provider, "notion"),
          eq(postExternalLinks.organizationId, organizationId),
        ),
      );
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
