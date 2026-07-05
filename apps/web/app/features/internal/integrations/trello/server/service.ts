import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import {
  getIntegration,
  getOrgSlugFromId,
  parseSettings,
} from "@features/internal/integrations/server/queries";
import type { TrelloSettings } from "@features/internal/integrations/trello/server/schemas";
import { getBaseUrl } from "@utils/base-url";
import { getEnv } from "@utils/get-env";
import { and, eq } from "drizzle-orm";
import { data, redirect } from "react-router";
import type { Db } from "@/db";
import { feedbackPosts, integrations, postExternalLinks } from "@/db/schema";
import {
  createTrelloCard,
  deleteTrelloWebhook,
  getTrelloBoards,
  getTrelloCardById,
  getTrelloLists,
  getTrelloMe,
  parseTrelloCardInput,
  registerTrelloWebhook,
  trelloAuthUrl,
} from "./client";

const CALLBACK_PATH = "/api/trello";

function callbackUrl(orgId: string) {
  return `${getBaseUrl()}${CALLBACK_PATH}?orgId=${orgId}`;
}

async function withToken<T>(
  db: Db,
  organizationId: string,
  fn: (apiKey: string, token: string) => Promise<T>,
): Promise<T> {
  const env = getEnv();
  if (!env.TRELLO_API_KEY) throw new Error("Trello not configured");
  const integration = await getIntegration(db, organizationId, "trello");
  if (!integration?.accessToken) throw new Error("Trello not connected");
  return fn(env.TRELLO_API_KEY, integration.accessToken);
}

// GET /api/trello?intent=connect → initiates OAuth (redirects to Trello authorize page)
// GET /api/trello?orgId=...&token=... → OAuth callback — token returned directly by Trello
export async function handleTrelloLoader(db: Db, request: Request) {
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");
  const token = url.searchParams.get("token");
  const orgId = url.searchParams.get("orgId");

  if (intent === "connect") {
    const { organizationId } = await requireOrganization(db, request);
    const env = getEnv();
    if (!env.TRELLO_API_KEY) {
      throw new Response("Trello not configured", { status: 501 });
    }
    return redirect(trelloAuthUrl(env.TRELLO_API_KEY, callbackUrl(organizationId)));
  }

  // Trello redirects back with ?orgId=...&token=... (no code exchange needed)
  if (token && orgId) {
    const env = getEnv();
    if (!env.TRELLO_API_KEY) return redirect("/");

    try {
      const me = await getTrelloMe(env.TRELLO_API_KEY, token);

      const existing = await getIntegration(db, orgId, "trello");
      const existingSettings = parseSettings<TrelloSettings>(existing?.settings ?? null);

      if (existing?.accessToken && existingSettings?.webhookId) {
        await deleteTrelloWebhook(
          env.TRELLO_API_KEY,
          existing.accessToken,
          existingSettings.webhookId,
        ).catch(() => {});
      }

      const settings: TrelloSettings = {
        memberId: me.id,
        memberUsername: me.username,
        defaultBoardId: existingSettings?.defaultBoardId,
        defaultBoardName: existingSettings?.defaultBoardName,
        defaultListId: existingSettings?.defaultListId,
        defaultListName: existingSettings?.defaultListName,
        autoCreateCards: existingSettings?.autoCreateCards ?? false,
        statusMappings: existingSettings?.statusMappings,
        webhookId: undefined,
      };

      await db
        .insert(integrations)
        .values({
          organizationId: orgId,
          provider: "trello",
          accessToken: token,
          settings: JSON.stringify(settings),
        })
        .onConflictDoUpdate({
          target: [integrations.organizationId, integrations.provider],
          set: { accessToken: token, settings: JSON.stringify(settings), updatedAt: new Date() },
        });
    } catch {
      // Redirect even on error — UI will show "not connected"
    }

    const orgSlug = await getOrgSlugFromId(db, orgId);
    return redirect(orgSlug ? `/${orgSlug}/settings/integrations/trello` : "/");
  }

  return data({});
}

export async function handleTrelloAction(db: Db, request: Request) {
  const { session, organizationId } = await requireOrganization(db, request);

  await requirePermission(db, organizationId, session.user.id, { settings: ["update"] });

  const body = (await request.json()) as { intent: string; [key: string]: unknown };

  if (body.intent === "list_boards") {
    try {
      const boards = await withToken(db, organizationId, (key, tok) => getTrelloBoards(key, tok));
      return data({ boards });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to fetch boards" },
        { status: 400 },
      );
    }
  }

  if (body.intent === "list_lists") {
    const boardId = body.boardId as string;
    if (!boardId) return data({ error: "boardId is required" }, { status: 400 });
    try {
      const lists = await withToken(db, organizationId, (key, tok) =>
        getTrelloLists(key, tok, boardId),
      );
      return data({ lists });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to fetch lists" },
        { status: 400 },
      );
    }
  }

  if (body.intent === "update_settings") {
    const integration = await getIntegration(db, organizationId, "trello");
    if (!integration) return data({ error: "No Trello integration found" }, { status: 400 });
    const settings = parseSettings<TrelloSettings>(integration.settings) ?? ({} as TrelloSettings);

    const newBoardId = body.defaultBoardId as string | undefined;
    const newBoardName = body.defaultBoardName as string | undefined;
    const newListId = body.defaultListId as string | undefined;
    const newListName = body.defaultListName as string | undefined;
    const boardChanged = newBoardId && newBoardId !== settings.defaultBoardId;

    let webhookId = settings.webhookId;

    if (boardChanged && newBoardId) {
      const env = getEnv();
      if (env.TRELLO_API_KEY && integration.accessToken) {
        if (webhookId) {
          await deleteTrelloWebhook(env.TRELLO_API_KEY, integration.accessToken, webhookId).catch(
            () => {},
          );
          webhookId = undefined;
        }

        const webhookBase = `${getBaseUrl()}/api/trello/webhook?orgId=${organizationId}`;
        const isLocal = webhookBase.includes("localhost") || webhookBase.includes("127.0.0.1");

        if (!isLocal) {
          try {
            webhookId = await registerTrelloWebhook(
              env.TRELLO_API_KEY,
              integration.accessToken,
              newBoardId,
              webhookBase,
            );
          } catch {
            // Non-fatal — status sync disabled without webhook
          }
        }
      }
    }

    const updated: TrelloSettings = {
      ...settings,
      defaultBoardId: newBoardId ?? settings.defaultBoardId,
      defaultBoardName: newBoardName ?? settings.defaultBoardName,
      defaultListId: newListId !== undefined ? newListId : settings.defaultListId,
      defaultListName: newListName !== undefined ? newListName : settings.defaultListName,
      autoCreateCards: !!(body.autoCreateCards as boolean),
      statusMappings:
        (body.statusMappings as TrelloSettings["statusMappings"]) ?? settings.statusMappings,
      webhookId,
    };

    await db
      .update(integrations)
      .set({
        settings: JSON.stringify(updated),
        connectedByUserId: session.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "trello")),
      );
    return data({ success: true });
  }

  if (body.intent === "disconnect") {
    const integration = await getIntegration(db, organizationId, "trello");
    if (integration?.accessToken) {
      const settings = parseSettings<TrelloSettings>(integration.settings);
      const env = getEnv();
      if (settings?.webhookId && env.TRELLO_API_KEY) {
        await deleteTrelloWebhook(
          env.TRELLO_API_KEY,
          integration.accessToken,
          settings.webhookId,
        ).catch(() => {});
      }
    }
    await db
      .delete(integrations)
      .where(
        and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "trello")),
      );
    return data({ success: true });
  }

  if (body.intent === "create_card") {
    const postId = body.postId as string;
    if (!postId) return data({ error: "postId is required" }, { status: 400 });

    const [integration, post] = await Promise.all([
      getIntegration(db, organizationId, "trello"),
      db.query.feedbackPosts.findFirst({
        where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
        columns: { id: true, title: true, description: true },
      }),
    ]);

    if (!integration?.accessToken) return data({ error: "Trello not connected" }, { status: 400 });
    const settings = parseSettings<TrelloSettings>(integration.settings);
    if (!settings?.defaultListId)
      return data(
        { error: "No list selected — set a default list in Trello settings" },
        { status: 400 },
      );
    if (!post) return data({ error: "Post not found" }, { status: 404 });

    const existingLink = await db.query.postExternalLinks.findFirst({
      where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "trello")),
      columns: { id: true },
    });
    if (existingLink)
      return data({ error: "Post already linked to a Trello card" }, { status: 400 });

    const env = getEnv();
    if (!env.TRELLO_API_KEY) return data({ error: "Trello not configured" }, { status: 501 });

    try {
      const desc = post.description
        ? `${post.description}\n\nCreated from Feeduro feedback #${post.id}`
        : `Created from Feeduro feedback #${post.id}`;

      const card = await createTrelloCard(
        env.TRELLO_API_KEY,
        integration.accessToken,
        settings.defaultListId,
        post.title,
        desc,
      );

      await db.insert(postExternalLinks).values({
        postId,
        organizationId,
        provider: "trello",
        externalId: card.id,
        externalUrl: card.url,
        identifier: card.id,
        externalTitle: card.name,
        externalStatus: settings.defaultListName ?? "",
        linkedByUserId: session.user.id,
        metadata: JSON.stringify({ boardId: settings.defaultBoardId }),
        lastSyncedAt: new Date(),
      });
      return data({ success: true, card });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to create Trello card" },
        { status: 400 },
      );
    }
  }

  if (body.intent === "link_card") {
    const postId = body.postId as string;
    const rawInput = (body.cardInput as string)?.trim();
    if (!postId || !rawInput)
      return data({ error: "postId and cardInput are required" }, { status: 400 });

    const cardId = parseTrelloCardInput(rawInput);

    const [integration, post] = await Promise.all([
      getIntegration(db, organizationId, "trello"),
      db.query.feedbackPosts.findFirst({
        where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
        columns: { id: true },
      }),
    ]);

    if (!integration?.accessToken) return data({ error: "Trello not connected" }, { status: 400 });
    if (!post) return data({ error: "Post not found" }, { status: 404 });

    const env = getEnv();
    if (!env.TRELLO_API_KEY) return data({ error: "Trello not configured" }, { status: 501 });
    const settings = parseSettings<TrelloSettings>(integration.settings);

    try {
      const card = await getTrelloCardById(env.TRELLO_API_KEY, integration.accessToken, cardId);

      await db
        .insert(postExternalLinks)
        .values({
          postId,
          organizationId,
          provider: "trello",
          externalId: card.id,
          externalUrl: card.url,
          identifier: card.id,
          externalTitle: card.name,
          externalStatus: card.listName ?? "",
          linkedByUserId: session.user.id,
          metadata: JSON.stringify({ boardId: settings?.defaultBoardId }),
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [postExternalLinks.postId, postExternalLinks.provider],
          set: {
            externalId: card.id,
            externalUrl: card.url,
            identifier: card.id,
            externalTitle: card.name,
            externalStatus: card.listName ?? "",
            lastSyncedAt: new Date(),
          },
        });
      return data({ success: true, card });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to link Trello card" },
        { status: 400 },
      );
    }
  }

  if (body.intent === "unlink_card") {
    const postId = body.postId as string;
    if (!postId) return data({ error: "postId is required" }, { status: 400 });
    await db
      .delete(postExternalLinks)
      .where(
        and(
          eq(postExternalLinks.postId, postId),
          eq(postExternalLinks.provider, "trello"),
          eq(postExternalLinks.organizationId, organizationId),
        ),
      );
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
