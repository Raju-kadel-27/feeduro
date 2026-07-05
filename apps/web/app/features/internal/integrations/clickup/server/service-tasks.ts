import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import type { Db } from "@/db";
import { feedbackPosts, postExternalLinks } from "@/db/schema";
import {
  deletePostExternalLink,
  insertPostExternalLink,
  upsertPostExternalLink,
} from "../../server/mutations";
import { getIntegration, parseSettings } from "../../server/queries";
import { createClickupTask, getClickupTask, getTaskIdentifier, parseClickupInput, searchClickupTasks } from "./client";
import type { ClickupAction, ClickupSettings } from "./schemas";

const LOG = "[clickup-tasks]";

function buildDescription(text: string | null | undefined, postId: string): string {
  const suffix = `*Created from [Feeduro](https://feeduro.com) feedback #${postId}*`;
  return text ? `${text}\n\n---\n${suffix}` : suffix;
}

export async function handleClickupTaskAction(db: Db, input: ClickupAction, organizationId: string, userId: string) {
  if (input.intent === "create_task") {
    const [integration, post] = await Promise.all([
      getIntegration(db, organizationId, "clickup"),
      db.query.feedbackPosts.findFirst({
        where: and(eq(feedbackPosts.id, input.postId), eq(feedbackPosts.organizationId, organizationId)),
        columns: { id: true, title: true, description: true },
      }),
    ]);
    if (!integration?.accessToken) return data({ error: "ClickUp not connected" }, { status: 400 });
    const settings = parseSettings<ClickupSettings>(integration.settings);
    const listId = input.listId ?? settings?.defaultListId;
    if (!listId) return data({ error: "No list selected — configure a default list in ClickUp settings" }, { status: 400 });
    if (!post) return data({ error: "Post not found" }, { status: 404 });
    const alreadyLinked = await db.query.postExternalLinks.findFirst({
      where: and(eq(postExternalLinks.postId, input.postId), eq(postExternalLinks.provider, "clickup")),
      columns: { id: true },
    });
    if (alreadyLinked) return data({ error: "Post already linked to a ClickUp task" }, { status: 400 });
    try {
      const task = await createClickupTask(
        integration.accessToken, listId,
        input.title ?? post.title,
        input.description ?? buildDescription(post.description, post.id),
      );
      console.log(`${LOG} task created taskId=${task.id} postId=${input.postId}`);
      await insertPostExternalLink(db, {
        postId: input.postId, organizationId, provider: "clickup",
        externalId: task.id, externalUrl: task.url, identifier: getTaskIdentifier(task),
        externalTitle: task.name, externalStatus: task.status.status, linkedByUserId: userId,
      });
      return data({ success: true, task });
    } catch (err) {
      console.error(`${LOG} create_task failed postId=${input.postId}:`, err instanceof Error ? err.message : err);
      return data({ error: err instanceof Error ? err.message : "Failed to create ClickUp task" }, { status: 400 });
    }
  }

  if (input.intent === "link_task") {
    const [integration, post] = await Promise.all([
      getIntegration(db, organizationId, "clickup"),
      db.query.feedbackPosts.findFirst({
        where: and(eq(feedbackPosts.id, input.postId), eq(feedbackPosts.organizationId, organizationId)),
        columns: { id: true },
      }),
    ]);
    if (!integration?.accessToken) return data({ error: "ClickUp not connected" }, { status: 400 });
    if (!post) return data({ error: "Post not found" }, { status: 404 });
    try {
      const task = await getClickupTask(integration.accessToken, parseClickupInput(input.taskId));
      await upsertPostExternalLink(db, {
        postId: input.postId, organizationId, provider: "clickup",
        externalId: task.id, externalUrl: task.url, identifier: getTaskIdentifier(task),
        externalTitle: task.name, externalStatus: task.status.status, linkedByUserId: userId,
      });
      console.log(`${LOG} linked taskId=${task.id} postId=${input.postId}`);
      return data({ success: true, task });
    } catch (err) {
      console.error(`${LOG} link_task failed:`, err instanceof Error ? err.message : err);
      return data({ error: err instanceof Error ? err.message : "Failed to link ClickUp task" }, { status: 400 });
    }
  }

  if (input.intent === "unlink_task") {
    await deletePostExternalLink(db, input.postId, "clickup", organizationId);
    return data({ success: true });
  }

  if (input.intent === "search_tasks") {
    try {
      const integration = await getIntegration(db, organizationId, "clickup");
      if (!integration?.accessToken) return data({ error: "ClickUp not connected" }, { status: 400 });
      const settings = parseSettings<ClickupSettings>(integration.settings);
      if (!settings?.workspaceId) return data({ error: "No workspace configured" }, { status: 400 });
      const tasks = await searchClickupTasks(integration.accessToken, settings.workspaceId, input.query);
      return data({
        results: tasks.map((t) => ({ id: t.id, identifier: getTaskIdentifier(t), title: t.name, status: t.status.status, url: t.url })),
      });
    } catch (err) {
      return data({ error: err instanceof Error ? err.message : "Search failed" }, { status: 400 });
    }
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
