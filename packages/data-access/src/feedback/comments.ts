import { decodeCursor, encodeCursor } from "@lib/api/cursor";
import { createId } from "@paralleldrive/cuid2";
import { and, asc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@feeduro/db";
import { comments, feedbackPosts, user } from "@feeduro/db/schema";

export const ListCommentsSchema = z.object({
  postId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export const CreateCommentSchema = z.object({
  postId: z.string().min(1),
  userId: z.string().min(1).openapi({ description: "Workspace member user ID" }),
  body: z.string().min(1).max(10000),
  parentId: z.string().optional(),
});

export const UpdateCommentSchema = z
  .object({ body: z.string().min(1).max(10000) })
  .openapi("UpdateComment");

const COMMENT_COLUMNS = {
  id: comments.id,
  postId: comments.postId,
  parentId: comments.parentId,
  body: comments.body,
  isPinned: comments.isPinned,
  createdAt: comments.createdAt,
  updatedAt: comments.updatedAt,
  authorName: user.name,
  authorEmail: user.email,
  userId: comments.userId,
} as const;

function formatComment(r: {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  authorName: string | null;
  authorEmail: string | null;
  userId: string | null;
}) {
  return {
    id: r.id,
    postId: r.postId,
    userId: r.userId,
    parentId: r.parentId,
    body: r.body,
    isPinned: r.isPinned,
    author: { name: r.authorName, email: r.authorEmail },
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function listComments(
  db: Db,
  organizationId: string,
  params: z.infer<typeof ListCommentsSchema>,
) {
  const { postId, limit, cursor } = params;
  const cursorDate = cursor ? decodeCursor(cursor) : null;

  const post = await db.query.feedbackPosts.findFirst({
    where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!post) return null;

  const rows = await db
    .select(COMMENT_COLUMNS)
    .from(comments)
    .leftJoin(user, eq(comments.userId, user.id))
    .where(
      and(
        eq(comments.postId, postId),
        eq(comments.organizationId, organizationId),
        eq(comments.isInternal, false),
        cursorDate ? lt(comments.createdAt, cursorDate) : undefined,
      ),
    )
    .orderBy(asc(comments.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1].createdAt) : undefined;

  return { data: items.map(formatComment), hasMore, cursor: nextCursor };
}

export async function getComment(db: Db, organizationId: string, commentId: string) {
  const [row] = await db
    .select(COMMENT_COLUMNS)
    .from(comments)
    .leftJoin(user, eq(comments.userId, user.id))
    .where(
      and(
        eq(comments.id, commentId),
        eq(comments.organizationId, organizationId),
        eq(comments.isInternal, false),
      ),
    )
    .limit(1);

  return row ? formatComment(row) : null;
}

type CreateCommentResult =
  | { data: ReturnType<typeof formatComment> }
  | { error: "post_not_found" | "user_not_found" | "parent_not_found" | "cannot_reply_to_reply" };

export async function createComment(
  db: Db,
  organizationId: string,
  input: z.infer<typeof CreateCommentSchema>,
  opts?: { waitUntil?: (p: Promise<unknown>) => void; onCreated?: (id: string) => void },
): Promise<CreateCommentResult> {
  const [post, author] = await Promise.all([
    db.query.feedbackPosts.findFirst({
      where: and(eq(feedbackPosts.organizationId, organizationId), eq(feedbackPosts.id, input.postId)),
      columns: { id: true },
    }),
    db.select({ id: user.id }).from(user).where(eq(user.id, input.userId)).limit(1),
  ]);

  if (!post) return { error: "post_not_found" };
  if (!author[0]) return { error: "user_not_found" };

  if (input.parentId) {
    const parent = await db.query.comments.findFirst({
      where: and(eq(comments.id, input.parentId), eq(comments.postId, input.postId)),
      columns: { id: true, parentId: true },
    });
    if (!parent) return { error: "parent_not_found" };
    if (parent.parentId) return { error: "cannot_reply_to_reply" };
  }

  const id = createId();

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

  opts?.onCreated?.(id);

  const comment = await getComment(db, organizationId, id);
  return { data: comment! };
}

export async function updateComment(
  db: Db,
  organizationId: string,
  commentId: string,
  input: z.infer<typeof UpdateCommentSchema>,
) {
  const [row] = await db
    .update(comments)
    .set({ body: input.body })
    .where(
      and(
        eq(comments.id, commentId),
        eq(comments.organizationId, organizationId),
        eq(comments.isInternal, false),
      ),
    )
    .returning({ id: comments.id });

  if (!row) return null;
  return getComment(db, organizationId, commentId);
}

export async function deleteComment(
  db: Db,
  organizationId: string,
  commentId: string,
): Promise<boolean> {
  const comment = await db.query.comments.findFirst({
    where: and(eq(comments.id, commentId), eq(comments.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!comment) return false;

  await db.transaction(async (tx) => {
    await tx.delete(comments).where(eq(comments.parentId, commentId));
    await tx
      .delete(comments)
      .where(and(eq(comments.id, commentId), eq(comments.organizationId, organizationId)));
  });

  return true;
}

type PinResult = "ok" | "not_found" | "cannot_pin_reply";

export async function pinComment(
  db: Db,
  organizationId: string,
  commentId: string,
  pinned: boolean,
): Promise<PinResult> {
  const comment = await db.query.comments.findFirst({
    where: and(eq(comments.id, commentId), eq(comments.organizationId, organizationId)),
    columns: { id: true, parentId: true, postId: true },
  });
  if (!comment) return "not_found";
  if (comment.parentId !== null) return "cannot_pin_reply";

  await db.transaction(async (tx) => {
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
