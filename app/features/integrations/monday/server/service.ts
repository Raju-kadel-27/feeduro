import { buildAuthUrl, exchangeCode } from "@services/oauth/flow.server";
import { buildOAuthState, parseOAuthState } from "@services/oauth/state.server";
import {
  createMondayItem,
  deleteMondayWebhook,
  getMondayBoards,
  getMondayGroups,
  getMondayItemById,
  getMondayMe,
  parseMondayItemInput,
  registerMondayWebhook,
} from "./client";
import { mondayOAuth } from "./oauth";
import { requireOrganization } from "@features/auth/server/guards";
import { isAdmin } from "@features/roles/server/queries";
import { getIntegration, getOrgSlugFromId, parseSettings } from "@features/integrations/server/queries";
import { getBaseUrl } from "@utils/base-url";
import { getEnv } from "@utils/get-env";
import { and, eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { data, redirect } from "react-router";
import { getDb } from "@/db";
import { feedbackPosts, integrations, postExternalLinks } from "@/db/schema";
import type { MondaySettings } from "@features/integrations/monday/server/schemas";

const CALLBACK_PATH = "/api/monday";

function callbackUrl() {
  return `${getBaseUrl()}${CALLBACK_PATH}`;
}

async function withToken<T>(
  organizationId: string,
  fn: (token: string) => Promise<T>,
): Promise<T> {
  const integration = await getIntegration(organizationId, "monday");
  if (!integration?.accessToken) throw new Error("Monday.com not connected");
  return fn(integration.accessToken);
}

// GET /api/monday?intent=connect → initiates OAuth
// GET /api/monday?code=...&state=... → OAuth callback from Monday.com
export async function handleMondayLoader(request: Request) {
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (intent === "connect") {
    const { organizationId } = await requireOrganization(request);
    const env = getEnv();
    if (!env.MONDAY_CLIENT_ID || !env.MONDAY_CLIENT_SECRET) {
      throw new Response("Monday.com OAuth not configured", { status: 501 });
    }
    const oauthState = buildOAuthState(organizationId);
    return redirect(buildAuthUrl(mondayOAuth, env.MONDAY_CLIENT_ID, callbackUrl(), oauthState));
  }

  if (error) return redirect("/");

  if (code && state) {
    const parsed = parseOAuthState(state);
    if (!parsed) return redirect("/");

    const env = getEnv();
    if (!env.MONDAY_CLIENT_ID || !env.MONDAY_CLIENT_SECRET) return redirect("/");

    try {
      const { accessToken } = await exchangeCode(
        mondayOAuth,
        code,
        env.MONDAY_CLIENT_ID,
        env.MONDAY_CLIENT_SECRET,
        callbackUrl(),
      );

      const me = await getMondayMe(accessToken);

      const db = getDb();
      const existing = await getIntegration(parsed.orgId, "monday");
      const existingSettings = parseSettings<MondaySettings>(existing?.settings ?? null);

      if (existing?.accessToken && existingSettings?.webhookIds?.length) {
        for (const wid of existingSettings.webhookIds) {
          await deleteMondayWebhook(existing.accessToken, wid).catch(() => {});
        }
      }

      const webhookSecret = existingSettings?.webhookSecret ?? createId();

      const settings: MondaySettings = {
        accountId: me.account.id,
        accountName: me.account.name,
        defaultBoardId: existingSettings?.defaultBoardId,
        defaultBoardName: existingSettings?.defaultBoardName,
        defaultGroupId: existingSettings?.defaultGroupId,
        autoCreateItems: existingSettings?.autoCreateItems ?? false,
        statusMappings: existingSettings?.statusMappings,
        webhookSecret,
        webhookIds: [],
      };

      await db
        .insert(integrations)
        .values({
          organizationId: parsed.orgId,
          provider: "monday",
          accessToken,
          settings: JSON.stringify(settings),
        })
        .onConflictDoUpdate({
          target: [integrations.organizationId, integrations.provider],
          set: { accessToken, settings: JSON.stringify(settings), updatedAt: new Date() },
        });
    } catch {
      // Redirect even on error — UI will show "not connected"
    }

    const orgSlug = await getOrgSlugFromId(parsed.orgId);
    return redirect(orgSlug ? `/${orgSlug}/settings/integrations/monday` : "/");
  }

  return data({});
}

export async function handleMondayAction(request: Request) {
  const { session, organizationId } = await requireOrganization(request);

  if (!(await isAdmin(organizationId, session.user.id))) {
    return data({ error: "Only admins can manage Monday.com integration" }, { status: 403 });
  }

  const body = (await request.json()) as { intent: string; [key: string]: unknown };

  if (body.intent === "list_boards") {
    try {
      const boards = await withToken(organizationId, (token) => getMondayBoards(token));
      return data({ boards });
    } catch (err) {
      return data({ error: err instanceof Error ? err.message : "Failed to fetch boards" }, { status: 400 });
    }
  }

  if (body.intent === "list_groups") {
    const boardId = body.boardId as string;
    if (!boardId) return data({ error: "boardId is required" }, { status: 400 });
    try {
      const groups = await withToken(organizationId, (token) => getMondayGroups(token, boardId));
      return data({ groups });
    } catch (err) {
      return data({ error: err instanceof Error ? err.message : "Failed to fetch groups" }, { status: 400 });
    }
  }

  if (body.intent === "update_settings") {
    const db = getDb();
    const integration = await getIntegration(organizationId, "monday");
    if (!integration) return data({ error: "No Monday.com integration found" }, { status: 400 });
    const settings = parseSettings<MondaySettings>(integration.settings) ?? ({} as MondaySettings);

    const newBoardId = body.defaultBoardId as string | undefined;
    const newBoardName = body.defaultBoardName as string | undefined;
    const newGroupId = body.defaultGroupId as string | undefined;
    const boardChanged = newBoardId && newBoardId !== settings.defaultBoardId;

    let webhookIds = settings.webhookIds ?? [];
    if (boardChanged && newBoardId && integration.accessToken) {
      for (const wid of webhookIds) {
        await deleteMondayWebhook(integration.accessToken, wid).catch(() => {});
      }
      webhookIds = [];

      const webhookBase = `${getBaseUrl()}/api/monday/webhook?orgId=${organizationId}&secret=${settings.webhookSecret}`;
      const isLocal = webhookBase.includes("localhost") || webhookBase.includes("127.0.0.1");

      if (!isLocal) {
        try {
          const [statusWid, deleteWid] = await Promise.all([
            registerMondayWebhook(integration.accessToken, newBoardId, webhookBase, "change_status_column_value"),
            registerMondayWebhook(integration.accessToken, newBoardId, webhookBase, "delete_pulse"),
          ]);
          webhookIds = [statusWid, deleteWid];
        } catch {
          // Non-fatal — status sync disabled without webhooks
        }
      }
    }

    const updated: MondaySettings = {
      ...settings,
      defaultBoardId: newBoardId ?? settings.defaultBoardId,
      defaultBoardName: newBoardName ?? settings.defaultBoardName,
      defaultGroupId: newGroupId !== undefined ? newGroupId : settings.defaultGroupId,
      autoCreateItems: !!(body.autoCreateItems as boolean),
      statusMappings: (body.statusMappings as MondaySettings["statusMappings"]) ?? settings.statusMappings,
      webhookIds,
    };

    await db
      .update(integrations)
      .set({ settings: JSON.stringify(updated), connectedByUserId: session.user.id, updatedAt: new Date() })
      .where(and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "monday")));
    return data({ success: true });
  }

  if (body.intent === "disconnect") {
    const db = getDb();
    const integration = await getIntegration(organizationId, "monday");
    if (integration?.accessToken) {
      const settings = parseSettings<MondaySettings>(integration.settings);
      if (settings?.webhookIds?.length) {
        for (const wid of settings.webhookIds) {
          await deleteMondayWebhook(integration.accessToken, wid).catch(() => {});
        }
      }
    }
    await db
      .delete(integrations)
      .where(and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "monday")));
    return data({ success: true });
  }

  if (body.intent === "create_item") {
    const postId = body.postId as string;
    if (!postId) return data({ error: "postId is required" }, { status: 400 });

    const db = getDb();
    const [integration, post] = await Promise.all([
      getIntegration(organizationId, "monday"),
      db.query.feedbackPosts.findFirst({
        where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
        columns: { id: true, title: true, description: true },
      }),
    ]);

    if (!integration?.accessToken) return data({ error: "Monday.com not connected" }, { status: 400 });
    const settings = parseSettings<MondaySettings>(integration.settings);
    if (!settings?.defaultBoardId)
      return data({ error: "No board selected — set a default board in Monday.com settings" }, { status: 400 });
    if (!post) return data({ error: "Post not found" }, { status: 404 });

    const existingLink = await db.query.postExternalLinks.findFirst({
      where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "monday")),
      columns: { id: true },
    });
    if (existingLink) return data({ error: "Post already linked to a Monday.com item" }, { status: 400 });

    try {
      const item = await createMondayItem(
        integration.accessToken,
        settings.defaultBoardId,
        settings.defaultGroupId,
        post.title,
      );

      await db.insert(postExternalLinks).values({
        postId,
        organizationId,
        provider: "monday",
        externalId: item.id,
        externalUrl: item.url,
        identifier: item.id,
        externalTitle: item.name,
        externalStatus: item.groupTitle ?? "",
        linkedByUserId: session.user.id,
        metadata: JSON.stringify({ boardId: settings.defaultBoardId }),
        lastSyncedAt: new Date(),
      });
      return data({ success: true, item });
    } catch (err) {
      return data({ error: err instanceof Error ? err.message : "Failed to create Monday.com item" }, { status: 400 });
    }
  }

  if (body.intent === "link_item") {
    const postId = body.postId as string;
    const rawInput = (body.itemInput as string)?.trim();
    if (!postId || !rawInput) return data({ error: "postId and itemInput are required" }, { status: 400 });

    const itemId = parseMondayItemInput(rawInput);
    const db = getDb();

    const [integration, post] = await Promise.all([
      getIntegration(organizationId, "monday"),
      db.query.feedbackPosts.findFirst({
        where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
        columns: { id: true },
      }),
    ]);

    if (!integration?.accessToken) return data({ error: "Monday.com not connected" }, { status: 400 });
    if (!post) return data({ error: "Post not found" }, { status: 404 });
    const settings = parseSettings<MondaySettings>(integration.settings);

    try {
      const item = await getMondayItemById(integration.accessToken, itemId);

      await db
        .insert(postExternalLinks)
        .values({
          postId,
          organizationId,
          provider: "monday",
          externalId: item.id,
          externalUrl: item.url,
          identifier: item.id,
          externalTitle: item.name,
          externalStatus: item.groupTitle ?? "",
          linkedByUserId: session.user.id,
          metadata: JSON.stringify({ boardId: settings?.defaultBoardId }),
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [postExternalLinks.postId, postExternalLinks.provider],
          set: {
            externalId: item.id,
            externalUrl: item.url,
            identifier: item.id,
            externalTitle: item.name,
            externalStatus: item.groupTitle ?? "",
            lastSyncedAt: new Date(),
          },
        });
      return data({ success: true, item });
    } catch (err) {
      return data({ error: err instanceof Error ? err.message : "Failed to link Monday.com item" }, { status: 400 });
    }
  }

  if (body.intent === "unlink_item") {
    const postId = body.postId as string;
    if (!postId) return data({ error: "postId is required" }, { status: 400 });
    const db = getDb();
    await db
      .delete(postExternalLinks)
      .where(
        and(
          eq(postExternalLinks.postId, postId),
          eq(postExternalLinks.provider, "monday"),
          eq(postExternalLinks.organizationId, organizationId),
        ),
      );
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
