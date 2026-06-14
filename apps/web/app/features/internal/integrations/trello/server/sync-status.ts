import { and, eq } from "drizzle-orm";
import { getEnv } from "@utils/get-env";
import { getDb } from "@/db";
import { postExternalLinks } from "@/db/schema";
import { getIntegration, parseSettings } from "../../server/queries";
import { moveTrelloCardToList } from "./client";
import type { TrelloSettings } from "./schemas";

const LOG = "[trello-sync-status]";

export async function syncStatusToTrello(
  organizationId: string,
  postId: string,
  newFeeduroStatus: string,
): Promise<void> {
  const db = getDb();
  const [link, integration] = await Promise.all([
    db.query.postExternalLinks.findFirst({
      where: and(
        eq(postExternalLinks.postId, postId),
        eq(postExternalLinks.provider, "trello"),
        eq(postExternalLinks.organizationId, organizationId),
      ),
      columns: { externalId: true },
    }),
    getIntegration(organizationId, "trello"),
  ]);

  if (!link) { console.log(`${LOG} no linked card postId=${postId}`); return; }
  if (!integration?.accessToken) { console.log(`${LOG} not connected orgId=${organizationId}`); return; }

  const env = getEnv();
  if (!env.TRELLO_API_KEY) { console.log(`${LOG} TRELLO_API_KEY not configured`); return; }

  const settings = parseSettings<TrelloSettings>(integration.settings);
  const mapping = settings?.statusMappings?.find((m) => m.feeduroStatus === newFeeduroStatus);
  if (!mapping) { console.log(`${LOG} no mapping for feeduroStatus="${newFeeduroStatus}" postId=${postId}`); return; }

  try {
    await moveTrelloCardToList(env.TRELLO_API_KEY, integration.accessToken, link.externalId, mapping.listId);
    console.log(`${LOG} moved cardId=${link.externalId} → listId=${mapping.listId}`);
  } catch (err) {
    console.error(`${LOG} failed cardId=${link.externalId}:`, err instanceof Error ? err.message : err);
  }
}
