import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import type { MondaySettings } from "@features/internal/integrations/monday/server/schemas";
import {
  getIntegration,
  getOrgSlugFromId,
  parseSettings,
} from "@features/internal/integrations/server/queries";
import { createId } from "@paralleldrive/cuid2";
import { buildAuthUrl, exchangeCode } from "@services/oauth/flow.server";
import { buildOAuthState, parseOAuthState } from "@services/oauth/state.server";
import { getBaseUrl } from "@utils/base-url";
import { getEnv } from "@utils/get-env";
import { and, eq } from "drizzle-orm";
import { data, redirect } from "react-router";
import type { Db } from "@/db";
import { feedbackPosts, integrations, postExternalLinks } from "@/db/schema";
import {
  createMondayItem,
  deleteMondayWebhook,
  getMondayBoards,
  getMondayGroups,
  getMondayItemById,
  getMondayMe,
  getMondayWebhook,
  parseMondayItemInput,
  registerMondayWebhook,
} from "./client";
import { mondayOAuth } from "./oauth";

const CALLBACK_PATH = "/api/monday";
const LOG = "[monday-service]";

function callbackUrl() {
  return `${getBaseUrl()}${CALLBACK_PATH}`;
}

async function withToken<T>(db: Db, organizationId: string, fn: (token: string) => Promise<T>): Promise<T> {
  const integration = await getIntegration(db, organizationId, "monday");
  if (!integration?.accessToken) throw new Error("Monday.com not connected");
  return fn(integration.accessToken);
}

// GET /api/monday?intent=connect → initiates OAuth
// GET /api/monday?code=...&state=... → OAuth callback from Monday.com
export async function handleMondayLoader(db: Db, request: Request) {
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (intent === "connect") {
    const { organizationId } = await requireOrganization(db, request);
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
    if (!parsed) {
      console.error(`${LOG} OAuth callback: invalid state param`);
      return redirect("/");
    }

    const env = getEnv();
    if (!env.MONDAY_CLIENT_ID || !env.MONDAY_CLIENT_SECRET) return redirect("/");

    console.log(`${LOG} OAuth callback started orgId=${parsed.orgId}`);
    try {
      const { accessToken, tokenExpiresAt } = await exchangeCode(
        mondayOAuth,
        code,
        env.MONDAY_CLIENT_ID,
        env.MONDAY_CLIENT_SECRET,
        callbackUrl(),
      );

      const me = await getMondayMe(accessToken);
      console.log(`${LOG} token exchanged accountId=${me.account.id} name="${me.account.name}"`);

      const existing = await getIntegration(db, parsed.orgId, "monday");
      const existingSettings = parseSettings<MondaySettings>(existing?.settings ?? null);

      if (existing?.accessToken && existingSettings?.webhookIds?.length) {
        console.log(`${LOG} cleaning up existing webhooks count=${existingSettings.webhookIds.length}`);
        for (const wid of existingSettings.webhookIds) {
          await deleteMondayWebhook(existing.accessToken, wid).catch((err) =>
            console.warn(`${LOG} failed to delete old webhook webhookId=${wid}:`, err),
          );
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

      console.log(`${LOG} saving integration orgId=${parsed.orgId}`);
      await db
        .insert(integrations)
        .values({
          organizationId: parsed.orgId,
          provider: "monday",
          accessToken,
          tokenExpiresAt: tokenExpiresAt ?? null,
          settings: JSON.stringify(settings),
        })
        .onConflictDoUpdate({
          target: [integrations.organizationId, integrations.provider],
          set: {
            accessToken,
            tokenExpiresAt: tokenExpiresAt ?? null,
            settings: JSON.stringify(settings),
            updatedAt: new Date(),
          },
        });
      console.log(`${LOG} OAuth callback complete orgId=${parsed.orgId}`);
    } catch (err) {
      console.error(
        `${LOG} OAuth callback failed orgId=${parsed.orgId}:`,
        err instanceof Error ? err.message : err,
      );
    }

    const orgSlug = await getOrgSlugFromId(db, parsed.orgId);
    return redirect(orgSlug ? `/${orgSlug}/settings/integrations/monday` : "/");
  }

  return data({});
}

export async function handleMondayAction(db: Db, request: Request) {
  const { session, organizationId } = await requireOrganization(db, request);

  await requirePermission(db, organizationId, session.user.id, { settings: ["update"] });

  const body = (await request.json()) as { intent: string; [key: string]: unknown };

  if (body.intent === "list_boards") {
    try {
      const boards = await withToken(db, organizationId, (token) => getMondayBoards(token));
      return data({ boards });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to fetch boards" },
        { status: 400 },
      );
    }
  }

  if (body.intent === "list_groups") {
    const boardId = body.boardId as string;
    if (!boardId) return data({ error: "boardId is required" }, { status: 400 });
    try {
      const groups = await withToken(db, organizationId, (token) => getMondayGroups(token, boardId));
      return data({ groups });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to fetch groups" },
        { status: 400 },
      );
    }
  }

  if (body.intent === "update_settings") {
    const integration = await getIntegration(db, organizationId, "monday");
    if (!integration) return data({ error: "No Monday.com integration found" }, { status: 400 });
    const settings = parseSettings<MondaySettings>(integration.settings) ?? ({} as MondaySettings);

    const newBoardId = body.defaultBoardId as string | undefined;
    const newBoardName = body.defaultBoardName as string | undefined;
    const newGroupId = body.defaultGroupId as string | undefined;
    const boardChanged = newBoardId && newBoardId !== settings.defaultBoardId;

    let webhookIds = settings.webhookIds ?? [];
    if (boardChanged && newBoardId && integration.accessToken) {
      if (webhookIds.length) {
        console.log(`${LOG} deleting old webhooks boardId=${settings.defaultBoardId} count=${webhookIds.length}`);
        for (const wid of webhookIds) {
          await deleteMondayWebhook(integration.accessToken, wid).catch((err) =>
            console.warn(`${LOG} failed to delete webhook webhookId=${wid}:`, err),
          );
        }
      }
      webhookIds = [];

      const webhookBase = `${getBaseUrl()}/api/monday/webhook?orgId=${organizationId}&secret=${settings.webhookSecret}`;
      const isLocal = webhookBase.includes("localhost") || webhookBase.includes("127.0.0.1");

      if (!isLocal) {
        console.log(`${LOG} registering webhook boardId=${newBoardId} orgId=${organizationId} event=change_column_value`);
        try {
          const statusWid = await registerMondayWebhook(
            integration.accessToken,
            newBoardId,
            webhookBase,
            "change_column_value",
          );
          webhookIds = [statusWid];
          console.log(`${LOG} webhook registered boardId=${newBoardId} webhookId=${statusWid} event=change_column_value url=${webhookBase}`);
          getMondayWebhook(integration.accessToken, statusWid)
            .then((wh) => console.log(`${LOG} webhook verified — Monday.com confirms url="${wh?.url}" event="${wh?.event}"`))
            .catch(() => {});
        } catch (err) {
          console.error(
            `${LOG} webhook registration failed — status sync will NOT work:`,
            err instanceof Error ? err.message : err,
          );
        }
      } else {
        console.warn(`${LOG} webhook skipped — local URL, status sync will NOT work`);
      }
    }

    const updated: MondaySettings = {
      ...settings,
      defaultBoardId: newBoardId ?? settings.defaultBoardId,
      defaultBoardName: newBoardName ?? settings.defaultBoardName,
      defaultGroupId: newGroupId !== undefined ? newGroupId : settings.defaultGroupId,
      autoCreateItems: !!(body.autoCreateItems as boolean),
      statusMappings:
        (body.statusMappings as MondaySettings["statusMappings"]) ?? settings.statusMappings,
      webhookIds,
    };

    await db
      .update(integrations)
      .set({
        settings: JSON.stringify(updated),
        connectedByUserId: session.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "monday")),
      );
    return data({ success: true });
  }

  if (body.intent === "disconnect") {
    console.log(`${LOG} disconnect orgId=${organizationId}`);
    const integration = await getIntegration(db, organizationId, "monday");
    if (integration?.accessToken) {
      const settings = parseSettings<MondaySettings>(integration.settings);
      if (settings?.webhookIds?.length) {
        console.log(`${LOG} deleting webhooks on disconnect count=${settings.webhookIds.length}`);
        for (const wid of settings.webhookIds) {
          await deleteMondayWebhook(integration.accessToken, wid).catch((err) =>
            console.warn(`${LOG} failed to delete webhook webhookId=${wid} on disconnect:`, err),
          );
        }
      } else {
        console.warn(`${LOG} disconnect — no webhookIds in settings, webhooks may still exist in Monday.com`);
      }
    }
    await db
      .delete(integrations)
      .where(
        and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "monday")),
      );
    console.log(`${LOG} disconnect done orgId=${organizationId}`);
    return data({ success: true });
  }

  if (body.intent === "create_item") {
    const postId = body.postId as string;
    if (!postId) return data({ error: "postId is required" }, { status: 400 });

    const [integration, post] = await Promise.all([
      getIntegration(db, organizationId, "monday"),
      db.query.feedbackPosts.findFirst({
        where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
        columns: { id: true, title: true, description: true },
      }),
    ]);

    if (!integration?.accessToken)
      return data({ error: "Monday.com not connected" }, { status: 400 });
    const settings = parseSettings<MondaySettings>(integration.settings);
    if (!settings?.defaultBoardId)
      return data(
        { error: "No board selected — set a default board in Monday.com settings" },
        { status: 400 },
      );
    if (!post) return data({ error: "Post not found" }, { status: 404 });

    const existingLink = await db.query.postExternalLinks.findFirst({
      where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "monday")),
      columns: { id: true },
    });
    if (existingLink)
      return data({ error: "Post already linked to a Monday.com item" }, { status: 400 });

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
      return data(
        { error: err instanceof Error ? err.message : "Failed to create Monday.com item" },
        { status: 400 },
      );
    }
  }

  if (body.intent === "link_item") {
    const postId = body.postId as string;
    const rawInput = (body.itemInput as string)?.trim();
    if (!postId || !rawInput)
      return data({ error: "postId and itemInput are required" }, { status: 400 });

    const itemId = parseMondayItemInput(rawInput);

    const [integration, post] = await Promise.all([
      getIntegration(db, organizationId, "monday"),
      db.query.feedbackPosts.findFirst({
        where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
        columns: { id: true },
      }),
    ]);

    if (!integration?.accessToken)
      return data({ error: "Monday.com not connected" }, { status: 400 });
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
      return data(
        { error: err instanceof Error ? err.message : "Failed to link Monday.com item" },
        { status: 400 },
      );
    }
  }

  if (body.intent === "unlink_item") {
    const postId = body.postId as string;
    if (!postId) return data({ error: "postId is required" }, { status: 400 });
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
