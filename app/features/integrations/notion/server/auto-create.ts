import { createNotionPage } from "./client";
import type { NotionSettings } from "./schemas";
import { getDb } from "@/db";
import { postExternalLinks } from "@/db/schema";
import { getIntegration, parseSettings } from "../../server/queries";
import { buildPostDescription, isAlreadyLinked, type AutoCreatePost } from "../../server/auto-create";

export async function autoCreateNotionPage(
  organizationId: string,
  post: AutoCreatePost,
  userId?: string,
): Promise<void> {
  const integration = await getIntegration(organizationId, "notion");
  if (!integration?.accessToken) return;

  const settings = parseSettings<NotionSettings>(integration.settings);
  if (!settings?.autoCreatePages || !settings.defaultDatabaseId) return;

  if (await isAlreadyLinked(post.id, "notion")) return;

  const page = await createNotionPage(
    integration.accessToken,
    settings.defaultDatabaseId,
    post.title,
    buildPostDescription(post),
  );

  const db = getDb();
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
