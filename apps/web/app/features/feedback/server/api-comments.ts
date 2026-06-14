import { decodeCursor, encodeCursor } from "@lib/api/cursor";
import { and, asc, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { comments, feedbackPosts, user } from "@/db/schema";

export const ListCommentsSchema = z.object({
  postId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

const COMMENT_SELECT = {
  id: comments.id,
  postId: comments.postId,
  userId: comments.userId,
  parentId: comments.parentId,
  body: comments.body,
  createdAt: comments.createdAt,
  updatedAt: comments.updatedAt,
  authorName: user.name,
  authorEmail: user.email,
} as const;

function formatComment(r: {
  id: string; postId: string; userId: string; parentId: string | null;
  body: string; createdAt: Date; updatedAt: Date;
  authorName: string | null; authorEmail: string | null;
}) {
  return {
    id: r.id,
    postId: r.postId,
    userId: r.userId,
    parentId: r.parentId,
    body: r.body,
    author: { name: r.authorName, email: r.authorEmail },
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function listComments(organizationId: string, params: z.infer<typeof ListCommentsSchema>) {
  const db = getDb();
  const { postId, limit, cursor } = params;
  const cursorDate = cursor ? decodeCursor(cursor) : null;

  const post = await db.query.feedbackPosts.findFirst({
    where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!post) return null;

  const rows = await db
    .select(COMMENT_SELECT)
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

export async function getComment(organizationId: string, commentId: string) {
  const db = getDb();
  const [row] = await db
    .select(COMMENT_SELECT)
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
