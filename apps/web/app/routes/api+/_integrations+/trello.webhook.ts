import { getIntegration, parseSettings } from "@features/internal/integrations/server/queries";
import { verifyTrelloWebhook } from "@features/internal/integrations/trello/server/client";
import type { TrelloSettings } from "@features/internal/integrations/trello/server/schemas";
import { getEnv } from "@utils/get-env";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackPosts, postExternalLinks } from "@/db/schema";
import type { Route } from "./+types/trello.webhook";

type TrelloAction =
  | {
      type: "updateCard";
      data: {
        card: { id: string; name: string; closed?: boolean };
        listAfter?: { id: string; name: string };
        listBefore?: { id: string; name: string };
        board: { id: string };
      };
    }
  | {
      type: "deleteCard";
      data: {
        card: { id: string };
        board: { id: string };
      };
    };

type TrelloWebhookPayload = { action?: TrelloAction };

// HEAD /api/trello/webhook — Trello sends a HEAD request to verify the endpoint is reachable
export async function loader() {
  return new Response(null, { status: 200 });
}

// POST /api/trello/webhook?orgId=<feeduro-org-id>
export async function action({ request }: Route.ActionArgs) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");
  if (!orgId) return new Response("Missing orgId", { status: 400 });

  const body = await request.text();

  const db = getDb();
  const integration = await getIntegration(orgId, "trello");
  if (!integration) return new Response("Integration not found", { status: 404 });

  // Verify HMAC-SHA1 signature using the Trello API secret
  const signature = request.headers.get("x-trello-webhook");
  const env = getEnv();
  if (signature && env.TRELLO_API_SECRET) {
    const callbackUrl = `${new URL(request.url).origin}/api/trello/webhook?orgId=${orgId}`;
    const valid = await verifyTrelloWebhook(env.TRELLO_API_SECRET, callbackUrl, body, signature);
    if (!valid) return new Response("Invalid signature", { status: 401 });
  }

  let payload: TrelloWebhookPayload;
  try {
    payload = JSON.parse(body) as TrelloWebhookPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (payload.action) {
    const settings = parseSettings<TrelloSettings>(integration.settings);
    await processAction(db, orgId, settings, payload.action);
  }

  return new Response("OK", { status: 200 });
}

async function processAction(
  db: ReturnType<typeof getDb>,
  orgId: string,
  settings: TrelloSettings | null,
  action: TrelloAction,
): Promise<void> {
  if (action.type === "deleteCard") {
    const cardId = action.data.card.id;
    await db
      .delete(postExternalLinks)
      .where(
        and(
          eq(postExternalLinks.externalId, cardId),
          eq(postExternalLinks.provider, "trello"),
          eq(postExternalLinks.organizationId, orgId),
        ),
      );
    return;
  }

  if (action.type === "updateCard") {
    const cardId = action.data.card.id;

    // Card archived
    if (action.data.card.closed) {
      await db
        .delete(postExternalLinks)
        .where(
          and(
            eq(postExternalLinks.externalId, cardId),
            eq(postExternalLinks.provider, "trello"),
            eq(postExternalLinks.organizationId, orgId),
          ),
        );
      return;
    }

    // Card moved to a different list
    const listAfter = action.data.listAfter;
    if (!listAfter) return;

    const link = await db.query.postExternalLinks.findFirst({
      where: and(
        eq(postExternalLinks.externalId, cardId),
        eq(postExternalLinks.provider, "trello"),
        eq(postExternalLinks.organizationId, orgId),
      ),
      columns: { id: true, postId: true },
    });
    if (!link) return;

    await db
      .update(postExternalLinks)
      .set({
        externalTitle: action.data.card.name,
        externalStatus: listAfter.name,
        lastSyncedAt: new Date(),
      })
      .where(eq(postExternalLinks.id, link.id));

    // Apply list → Feeduro status mapping
    const mappings = settings?.statusMappings ?? [];
    const match = mappings.find((m) => m.listId === listAfter.id);
    if (match?.feeduroStatus) {
      await db
        .update(feedbackPosts)
        .set({ status: match.feeduroStatus as typeof feedbackPosts.$inferSelect.status })
        .where(and(eq(feedbackPosts.id, link.postId), eq(feedbackPosts.organizationId, orgId)));
    }
  }
}
