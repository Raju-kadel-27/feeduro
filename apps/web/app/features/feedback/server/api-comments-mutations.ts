import { notifyMentions, notifyNewComment } from "@features/internal/notifications/server/service";
import { dispatchWebhook } from "@features/internal/webhooks/server/dispatch";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { type RouterContextProvider } from "react-router";
import { z } from "zod";
import type { Db } from "@/db";
import { comments, feedbackPosts, user } from "@/db/schema";

export const CreateCommentSchema = z.object({
  postId: z.string().min(1),
  userId: z.string().min(1),
  body: z.string().min(1).max(10000),
  parentId: z.string().optional(),
});

type CreateCommentResult =
  | { data: { id: string; postId: string; userId: string; parentId: string | null; body: string; createdAt: Date } }
  | { error: "post_not_found" | "user_not_found" | "parent_not_found" | "cannot_reply_to_reply" };

export async function createComment(
  db: Db,
  organizationId: string,
  input: z.infer<typeof CreateCommentSchema>,
  context: Readonly<RouterContextProvider>,
): Promise<CreateCommentResult> {
  const [post, authorRows] = await Promise.all([
    db.query.feedbackPosts.findFirst({
      where: and(eq(feedbackPosts.organizationId, organizationId), eq(feedbackPosts.id, input.postId)),
      columns: { id: true, title: true },
    }),
    db.select({ id: user.id, name: user.name }).from(user).where(eq(user.id, input.userId)).limit(1),
  ]);

  if (!post) return { error: "post_not_found" };
  if (!authorRows[0]) return { error: "user_not_found" };

  if (input.parentId) {
    const parent = await db.query.comments.findFirst({
      where: and(eq(comments.id, input.parentId), eq(comments.postId, input.postId)),
      columns: { id: true, parentId: true },
    });
    if (!parent) return { error: "parent_not_found" };
    if (parent.parentId) return { error: "cannot_reply_to_reply" };
  }

  const id = createId();
  const createdAt = new Date();
  const actorName = authorRows[0].name ?? "Someone";

  await db.insert(comments).values({
    id,
    postId: input.postId,
    organizationId,
    userId: input.userId,
    parentId: input.parentId ?? null,
    body: input.body,
    isInternal: false,
    isAiGenerated: false,
  });

  dispatchWebhook(context, organizationId, "comment.created", {
    id,
    postId: input.postId,
    parentId: input.parentId ?? null,
    body: input.body,
    authorId: input.userId,
    isReply: !!input.parentId,
  });

  await Promise.all([
    notifyNewComment({ postId: input.postId, commentBody: input.body, actorId: input.userId, organizationId, postTitle: post.title, actorName }),
    notifyMentions({ postId: input.postId, commentBody: input.body, actorId: input.userId, organizationId, postTitle: post.title, actorName }),
  ]);

  return { data: { id, postId: input.postId, userId: input.userId, parentId: input.parentId ?? null, body: input.body, createdAt } };
}

export async function deleteComment(db: Db, organizationId: string, commentId: string): Promise<boolean> {
  const comment = await db.query.comments.findFirst({
    where: and(eq(comments.id, commentId), eq(comments.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!comment) return false;

  await db.transaction(async (tx) => {
    await tx.delete(comments).where(eq(comments.parentId, commentId));
    await tx.delete(comments).where(and(eq(comments.id, commentId), eq(comments.organizationId, organizationId)));
  });

  return true;
}

type PinCommentResult = "ok" | "not_found" | "cannot_pin_reply";

export async function pinComment(
  db: Db,
  organizationId: string,
  commentId: string,
  pinned: boolean,
): Promise<PinCommentResult> {
  const comment = await db.query.comments.findFirst({
    where: and(eq(comments.id, commentId), eq(comments.organizationId, organizationId)),
    columns: { id: true, parentId: true, postId: true },
  });
  if (!comment) return "not_found";
  if (comment.parentId !== null) return "cannot_pin_reply";

  await db.transaction(async (tx) => {
    // Enforce 1-pin limit: clear any existing pin on this post before setting the new one
    if (pinned) {
      await tx
        .update(comments)
        .set({ isPinned: false, pinnedAt: null })
        .where(and(eq(comments.postId, comment.postId), eq(comments.organizationId, organizationId)));
    }
    await tx
      .update(comments)
      .set({ isPinned: pinned, pinnedAt: pinned ? new Date() : null })
      .where(and(eq(comments.id, commentId), eq(comments.organizationId, organizationId)));
  });

  return "ok";
}
