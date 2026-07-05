import type { Db } from "@/db";
import { type AutoCreatePost, isAlreadyLinked } from "../../server/auto-create";
import { insertPostExternalLink } from "../../server/mutations";
import { getIntegration, parseSettings } from "../../server/queries";
import { createClickupTask, getTaskIdentifier } from "./client";
import type { ClickupSettings } from "./schemas";

const LOG = "[clickup-auto-create]";

export async function autoCreateClickupTask(
  db: Db,
  organizationId: string,
  post: AutoCreatePost,
  userId?: string,
): Promise<void> {
  const integration = await getIntegration(db, organizationId, "clickup");
  if (!integration?.accessToken) {
    console.log(`${LOG} skipped — no integration orgId=${organizationId}`);
    return;
  }

  const settings = parseSettings<ClickupSettings>(integration.settings);
  if (!settings?.autoCreateTasks) {
    console.log(`${LOG} skipped — autoCreateTasks=false orgId=${organizationId}`);
    return;
  }
  if (!settings.defaultListId) {
    console.log(`${LOG} skipped — no defaultListId orgId=${organizationId}`);
    return;
  }

  if (await isAlreadyLinked(db, post.id, "clickup")) {
    console.log(`${LOG} skipped — already linked postId=${post.id}`);
    return;
  }

  console.log(`${LOG} creating task postId=${post.id} listId=${settings.defaultListId}`);

  try {
    const suffix = `*Created from [Feeduro](https://feeduro.com) feedback #${post.id}*`;
    const description = post.description ? `${post.description}\n\n---\n${suffix}` : suffix;

    const task = await createClickupTask(
      integration.accessToken,
      settings.defaultListId,
      post.title,
      description,
    );

    console.log(`${LOG} task created taskId=${task.id} postId=${post.id}`);

    await insertPostExternalLink(db, {
      postId: post.id,
      organizationId,
      provider: "clickup",
      externalId: task.id,
      externalUrl: task.url,
      identifier: getTaskIdentifier(task),
      externalTitle: task.name,
      externalStatus: task.status.status,
      linkedByUserId: userId,
    });

    console.log(`${LOG} link saved postId=${post.id} taskId=${task.id}`);
  } catch (err) {
    console.error(`${LOG} failed postId=${post.id}:`, err instanceof Error ? err.message : err);
  }
}
