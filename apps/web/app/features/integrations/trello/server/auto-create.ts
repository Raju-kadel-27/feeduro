import { getEnv } from "@utils/get-env";
import { getDb } from "@/db";
import { postExternalLinks } from "@/db/schema";
import {
  type AutoCreatePost,
  buildPostDescription,
  isAlreadyLinked,
} from "../../server/auto-create";
import { getIntegration, parseSettings } from "../../server/queries";
import { createTrelloCard } from "./client";
import type { TrelloSettings } from "./schemas";

export async function autoCreateTrelloCard(
  organizationId: string,
  post: AutoCreatePost,
  userId?: string,
): Promise<void> {
  const env = getEnv();
  if (!env.TRELLO_API_KEY) return;

  const integration = await getIntegration(organizationId, "trello");
  if (!integration?.accessToken) return;

  const settings = parseSettings<TrelloSettings>(integration.settings);
  if (!settings?.autoCreateCards || !settings.defaultListId) return;

  if (await isAlreadyLinked(post.id, "trello")) return;

  const card = await createTrelloCard(
    env.TRELLO_API_KEY,
    integration.accessToken,
    settings.defaultListId,
    post.title,
    buildPostDescription(post),
  );

  const db = getDb();
  await db.insert(postExternalLinks).values({
    postId: post.id,
    organizationId,
    provider: "trello",
    externalId: card.id,
    externalUrl: card.url,
    identifier: card.id,
    externalTitle: card.name,
    externalStatus: settings.defaultListName ?? "",
    linkedByUserId: userId,
    metadata: JSON.stringify({ boardId: settings.defaultBoardId }),
    lastSyncedAt: new Date(),
  });
}
