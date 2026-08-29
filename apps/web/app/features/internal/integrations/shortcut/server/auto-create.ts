import type { Db } from "@/db";
import { type AutoCreatePost, isAlreadyLinked } from "../../server/auto-create";
import { insertPostExternalLink } from "../../server/mutations";
import { getIntegration, parseSettings } from "../../server/queries";
import { createShortcutStory } from "./client";
import type { ShortcutSettings } from "./schemas";

export async function autoCreateShortcutStory(
  db: Db,
  organizationId: string,
  post: AutoCreatePost,
  userId?: string,
): Promise<void> {
  const integration = await getIntegration(db, organizationId, "shortcut");
  if (!integration?.accessToken) return;

  const settings = parseSettings<ShortcutSettings>(integration.settings);
  if (!settings?.autoCreateStories || !settings.defaultWorkflowStateId) return;

  if (await isAlreadyLinked(db, post.id, "shortcut")) return;

  const description = post.description
    ? `${post.description}\n\n---\n*Created from [Feeduro](https://feeduro.com) feedback #${post.id}*`
    : `*Created from [Feeduro](https://feeduro.com) feedback #${post.id}*`;

  const story = await createShortcutStory(
    integration.accessToken,
    settings.defaultWorkflowStateId,
    post.title,
    description,
  );

  await insertPostExternalLink(db, {
    postId: post.id,
    organizationId,
    provider: "shortcut",
    externalId: String(story.id),
    externalUrl: story.app_url,
    identifier: `SC-${story.id}`,
    externalTitle: story.name,
    linkedByUserId: userId,
  });
}
