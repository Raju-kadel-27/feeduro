import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackTags, member, postTags } from "@/db/schema";

export async function getOrgTags(organizationId: string) {
  const db = getDb();
  return db.query.feedbackTags.findMany({
    where: eq(feedbackTags.organizationId, organizationId),
    columns: { id: true, name: true, color: true },
  });
}

export async function getPostTags(postId: string) {
  const db = getDb();
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

export async function getPostTagsBatch(postIds: string[]) {
  if (postIds.length === 0) return [];
  const db = getDb();
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

export async function createTag(organizationId: string, name: string, color: string) {
  const db = getDb();
  const [tag] = await db
    .insert(feedbackTags)
    .values({ organizationId, name: name.trim(), color })
    .returning({ id: feedbackTags.id, name: feedbackTags.name, color: feedbackTags.color });
  return tag;
}

export async function deleteTag(organizationId: string, tagId: string) {
  const db = getDb();
  await db
    .delete(feedbackTags)
    .where(and(eq(feedbackTags.id, tagId), eq(feedbackTags.organizationId, organizationId)));
}

export async function addTagToPost(
  postId: string,
  tagId: string,
  userId: string,
  organizationId: string,
) {
  const db = getDb();
  // Verify the tag belongs to the org
  const tag = await db.query.feedbackTags.findFirst({
    where: and(eq(feedbackTags.id, tagId), eq(feedbackTags.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!tag) throw new Error("Tag not found");

  await db.insert(postTags).values({ postId, tagId, addedByUserId: userId }).onConflictDoNothing();
}

export async function removeTagFromPost(postId: string, tagId: string) {
  const db = getDb();
  await db.delete(postTags).where(and(eq(postTags.postId, postId), eq(postTags.tagId, tagId)));
}
