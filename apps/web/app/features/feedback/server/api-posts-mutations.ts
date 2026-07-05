import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { feedbackBoards, feedbackPosts } from "@/db/schema";
import { CreatePostSchema, getPost, UpdatePostSchema } from "./api-posts";

export async function createPost(db: Db, organizationId: string, input: z.infer<typeof CreatePostSchema>) {
  const board = await db.query.feedbackBoards.findFirst({
    where: and(eq(feedbackBoards.organizationId, organizationId), eq(feedbackBoards.id, input.boardId)),
    columns: { id: true },
  });
  if (!board) return null;

  const [row] = await db
    .insert(feedbackPosts)
    .values({
      id: createId(),
      organizationId,
      boardId: input.boardId,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      categoryId: input.categoryId ?? null,
    })
    .returning({ id: feedbackPosts.id });

  return getPost(db, organizationId, row.id);
}

export async function updatePost(
  db: Db,
  organizationId: string,
  postId: string,
  input: z.infer<typeof UpdatePostSchema>,
) {
  const existing = await db.query.feedbackPosts.findFirst({
    where: and(eq(feedbackPosts.organizationId, organizationId), eq(feedbackPosts.id, postId)),
    columns: { id: true },
  });
  if (!existing) return null;

  await db
    .update(feedbackPosts)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      ...(input.boardId !== undefined && { boardId: input.boardId }),
    })
    .where(and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)));

  return getPost(db, organizationId, postId);
}

export async function deletePost(db: Db, organizationId: string, postId: string): Promise<boolean> {
  const result = await db
    .delete(feedbackPosts)
    .where(and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)))
    .returning({ id: feedbackPosts.id });
  return result.length > 0;
}
