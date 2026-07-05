import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { feedbackTags, postTags } from "@/db/schema";

export async function getOrgTags(db: Db, organizationId: string) {
  return db.query.feedbackTags.findMany({
    where: eq(feedbackTags.organizationId, organizationId),
    columns: { id: true, name: true, color: true },
  });
}

export async function getPostTags(db: Db, postId: string) {
  const rows = await db
    .select({
      id: feedbackTags.id,
      name: feedbackTags.name,
      color: feedbackTags.color,
    })
    .from(postTags)
    .innerJoin(feedbackTags, eq(postTags.tagId, feedbackTags.id))
    .where(eq(postTags.postId, postId));
  return rows;
}

export async function getPostTagsBatch(db: Db, postIds: string[]) {
  if (postIds.length === 0) return [];
  return db
    .select({
      postId: postTags.postId,
      id: feedbackTags.id,
      name: feedbackTags.name,
      color: feedbackTags.color,
    })
    .from(postTags)
    .innerJoin(feedbackTags, eq(postTags.tagId, feedbackTags.id))
    .where(inArray(postTags.postId, postIds));
}

export async function createTag(db: Db, organizationId: string, name: string, color: string) {
  const [tag] = await db
    .insert(feedbackTags)
    .values({ organizationId, name: name.trim(), color })
    .returning({ id: feedbackTags.id, name: feedbackTags.name, color: feedbackTags.color });
  return tag;
}

export async function deleteTag(db: Db, organizationId: string, tagId: string) {
  await db
    .delete(feedbackTags)
    .where(and(eq(feedbackTags.id, tagId), eq(feedbackTags.organizationId, organizationId)));
}

export async function addTagToPost(
  db: Db,
  postId: string,
  tagId: string,
  userId: string,
  organizationId: string,
) {
  const tag = await db.query.feedbackTags.findFirst({
    where: and(eq(feedbackTags.id, tagId), eq(feedbackTags.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!tag) throw new Error("Tag not found");

  await db.insert(postTags).values({ postId, tagId, addedByUserId: userId }).onConflictDoNothing();
}

export async function removeTagFromPost(db: Db, postId: string, tagId: string) {
  await db.delete(postTags).where(and(eq(postTags.postId, postId), eq(postTags.tagId, tagId)));
}
