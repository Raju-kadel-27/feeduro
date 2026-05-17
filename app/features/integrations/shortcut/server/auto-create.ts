import { createShortcutStory } from "./client";
import type { ShortcutSettings } from "./schemas";
import { getIntegration, parseSettings } from "../../server/queries";
import { insertPostExternalLink } from "../../server/mutations";
import { isAlreadyLinked, type AutoCreatePost } from "../../server/auto-create";

export async function autoCreateShortcutStory(
  organizationId: string,
  post: AutoCreatePost,
  userId?: string,
): Promise<void> {
  const integration = await getIntegration(organizationId, "shortcut");
  if (!integration?.accessToken) return;

  const settings = parseSettings<ShortcutSettings>(integration.settings);
  if (!settings?.autoCreateStories || !settings.defaultWorkflowStateId) return;

  if (await isAlreadyLinked(post.id, "shortcut")) return;

  const description = post.description
    ? `${post.description}\n\n---\n*Created from [Feediyo](https://feediyo.com) feedback #${post.id}*`
    : `*Created from [Feediyo](https://feediyo.com) feedback #${post.id}*`;

  const story = await createShortcutStory(
    integration.accessToken,
    settings.defaultWorkflowStateId,
    post.title,
    description,
  );

  await insertPostExternalLink({
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
