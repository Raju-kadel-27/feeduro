import type { Db } from "@/db";
import { postExternalLinks } from "@/db/schema";
import { type AutoCreatePost, isAlreadyLinked } from "../../server/auto-create";
import { getIntegration, parseSettings } from "../../server/queries";
import { createMondayItem } from "./client";
import type { MondaySettings } from "./schemas";

export async function autoCreateMondayItem(
  db: Db,
  organizationId: string,
  post: AutoCreatePost,
  userId?: string,
): Promise<void> {
  const integration = await getIntegration(db, organizationId, "monday");
  if (!integration?.accessToken) return;

  const settings = parseSettings<MondaySettings>(integration.settings);
  if (!settings?.autoCreateItems || !settings.defaultBoardId) return;

  if (await isAlreadyLinked(db, post.id, "monday")) return;

  // Monday.com items have no description field — only the item name is set on creation.
  const item = await createMondayItem(
    integration.accessToken,
    settings.defaultBoardId,
    settings.defaultGroupId,
    post.title,
  );

  await db.insert(postExternalLinks).values({
    postId: post.id,
    organizationId,
    provider: "monday",
    externalId: item.id,
    externalUrl: item.url,
    identifier: item.id,
    externalTitle: item.name,
    externalStatus: item.groupTitle ?? "",
    linkedByUserId: userId,
    metadata: JSON.stringify({ boardId: settings.defaultBoardId }),
    lastSyncedAt: new Date(),
  });
}
