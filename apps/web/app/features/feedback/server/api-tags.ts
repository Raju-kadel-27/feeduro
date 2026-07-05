import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { feedbackPosts, feedbackTags, postTags } from "@/db/schema";
import { createTag, deleteTag, getOrgTags } from "./tags";

export const CreateTagSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
    .default("#6366f1"),
});

export const AddTagToPostSchema = z.object({
  tagId: z.string().min(1),
});

export async function listTags(db: Db, organizationId: string) {
  return getOrgTags(db, organizationId);
}

export async function createOrgTag(
  db: Db,
  organizationId: string,
  input: z.infer<typeof CreateTagSchema>,
): Promise<{ data: { id: string; name: string; color: string } } | { error: "tag_name_exists" }> {
  try {
    const tag = await createTag(db, organizationId, input.name, input.color);
    return { data: tag };
  } catch {
    return { error: "tag_name_exists" };
  }
}

export async function deleteOrgTag(db: Db, organizationId: string, tagId: string): Promise<boolean> {
  const tag = await db.query.feedbackTags.findFirst({
    where: and(eq(feedbackTags.id, tagId), eq(feedbackTags.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!tag) return false;
  await deleteTag(db, organizationId, tagId);
  return true;
}

type PostTagResult =
  | { data: { postId: string; tagId: string } }
  | { error: "post_not_found" | "tag_not_found" };

export async function addPostTag(
  db: Db,
  organizationId: string,
  postId: string,
  tagId: string,
): Promise<PostTagResult> {
  const [post, tag] = await Promise.all([
    db.query.feedbackPosts.findFirst({
      where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
      columns: { id: true },
    }),
    db.query.feedbackTags.findFirst({
      where: and(eq(feedbackTags.id, tagId), eq(feedbackTags.organizationId, organizationId)),
      columns: { id: true },
    }),
  ]);

  if (!post) return { error: "post_not_found" };
  if (!tag) return { error: "tag_not_found" };

  await db
    .insert(postTags)
    .values({ postId, tagId, addedByUserId: null })
    .onConflictDoNothing();

  return { data: { postId, tagId } };
}

export async function removePostTag(
  db: Db,
  organizationId: string,
  postId: string,
  tagId: string,
): Promise<boolean> {
  const post = await db.query.feedbackPosts.findFirst({
    where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!post) return false;

  const result = await db
    .delete(postTags)
    .where(and(eq(postTags.postId, postId), eq(postTags.tagId, tagId)))
    .returning({ postId: postTags.postId });

  return result.length > 0;
}
