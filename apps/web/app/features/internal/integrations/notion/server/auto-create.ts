import type { Db } from "@/db";
import { postExternalLinks } from "@/db/schema";
import {
  type AutoCreatePost,
  buildPostDescription,
  isAlreadyLinked,
} from "../../server/auto-create";
import { getIntegration, parseSettings } from "../../server/queries";
import { createNotionPage } from "./client";
import type { NotionSettings } from "./schemas";

export async function autoCreateNotionPage(
  db: Db,
  organizationId: string,
  post: AutoCreatePost,
  userId?: string,
): Promise<void> {
  const integration = await getIntegration(db, organizationId, "notion");
  if (!integration?.accessToken) return;

  const settings = parseSettings<NotionSettings>(integration.settings);
  if (!settings?.autoCreatePages || !settings.defaultDatabaseId) return;

  if (await isAlreadyLinked(db, post.id, "notion")) return;

  const page = await createNotionPage(
    integration.accessToken,
    settings.defaultDatabaseId,
    post.title,
    buildPostDescription(post),
  );

  await db.insert(postExternalLinks).values({
    postId: post.id,
    organizationId,
    provider: "notion",
    externalId: page.id,
    externalUrl: page.url,
    identifier: page.id.slice(0, 8),
    externalTitle: page.title,
    linkedByUserId: userId,
    lastSyncedAt: new Date(),
  });
}
