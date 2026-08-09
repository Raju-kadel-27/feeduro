import { and, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@feeduro/db";
import { feedbackPosts, feedbackTags, postTags } from "@feeduro/db/schema";

export const ListPostsSchema = z.object({
  boardId: z.string().optional(),
  status: z.enum(["open", "reviewing", "planned", "in-progress", "completed", "closed"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export const CreatePostSchema = z.object({
  boardId: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  status: z.enum(["open", "reviewing", "planned", "in-progress", "completed", "closed"]).default("open"),
  categoryId: z.string().optional(),
});

export const UpdatePostSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).nullable().optional(),
  status: z.enum(["open", "reviewing", "planned", "in-progress", "completed", "closed"]).optional(),
  categoryId: z.string().nullable().optional(),
  boardId: z.string().optional(),
});

export const POST_COLS = {
  id: true, boardId: true, title: true, description: true, status: true,
  categoryId: true, voteCount: true, isPublicSubmission: true, createdBy: true,
  createdAt: true, updatedAt: true,
} as const;

export function encodeCursor(date: Date): string {
  return Buffer.from(date.toISOString()).toString("base64url");
}

export function decodeCursor(cursor: string): Date | null {
  try {
    return new Date(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function getTagsForPosts(db: Db, postIds: string[]) {
  if (postIds.length === 0) return {} as Record<string, { id: string; name: string; color: string }[]>;
  const rows = await db
    .select({ postId: postTags.postId, id: feedbackTags.id, name: feedbackTags.name, color: feedbackTags.color })
    .from(postTags)
    .innerJoin(feedbackTags, eq(postTags.tagId, feedbackTags.id))
    .where(inArray(postTags.postId, postIds));

  const map: Record<string, { id: string; name: string; color: string }[]> = {};
  for (const row of rows) {
    if (!map[row.postId]) map[row.postId] = [];
    map[row.postId].push({ id: row.id, name: row.name, color: row.color });
  }
  return map;
}

export async function listPosts(db: Db, organizationId: string, params: z.infer<typeof ListPostsSchema>) {
  const { boardId, status, limit, cursor } = params;
  const cursorDate = cursor ? decodeCursor(cursor) : null;

  const posts = await db.query.feedbackPosts.findMany({
    where: and(
      eq(feedbackPosts.organizationId, organizationId),
      isNull(feedbackPosts.mergedIntoPostId),
      boardId ? eq(feedbackPosts.boardId, boardId) : undefined,
      status ? eq(feedbackPosts.status, status) : undefined,
      cursorDate ? lt(feedbackPosts.createdAt, cursorDate) : undefined,
    ),
    columns: POST_COLS,
    orderBy: [desc(feedbackPosts.createdAt)],
    limit: limit + 1,
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1].createdAt) : undefined;
  const tagMap = await getTagsForPosts(db, items.map((p) => p.id));

  return { data: items.map((p) => ({ ...p, tags: tagMap[p.id] ?? [] })), hasMore, cursor: nextCursor };
}

export async function getPost(db: Db, organizationId: string, postId: string) {
  const post = await db.query.feedbackPosts.findFirst({
    where: and(eq(feedbackPosts.organizationId, organizationId), eq(feedbackPosts.id, postId)),
    columns: POST_COLS,
  });
  if (!post) return null;
  const tagMap = await getTagsForPosts(db, [postId]);
  return { ...post, tags: tagMap[postId] ?? [] };
}
