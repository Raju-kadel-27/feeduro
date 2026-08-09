import { and, desc, eq, ilike, inArray, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import {
  changelogAuthors,
  changelogRequests,
  changelogTagItems,
  changelogTags,
  feedbackPosts,
  member,
  user,
} from "@/db/schema";

export async function getChangelogAppliedTags(db: Db, changelogId: string) {
  return db
    .select({ id: changelogTags.id, name: changelogTags.name })
    .from(changelogTagItems)
    .innerJoin(changelogTags, eq(changelogTagItems.tagId, changelogTags.id))
    .where(eq(changelogTagItems.changelogId, changelogId));
}

export async function getChangelogAuthorsForEditor(db: Db, organizationId: string, changelogId: string) {
  const rows = await db.query.changelogAuthors.findMany({
    where: and(
      eq(changelogAuthors.changelogId, changelogId),
      eq(changelogAuthors.organizationId, organizationId),
    ),
    columns: { userId: true },
  });
  if (rows.length === 0) return [];
  const userIds = rows.map((r) => r.userId);
  return db.query.user.findMany({
    where: inArray(user.id, userIds),
    columns: { id: true, name: true, email: true, image: true },
  });
}

export async function getChangelogLinkedRequests(db: Db, organizationId: string, changelogId: string) {
  const rows = await db.query.changelogRequests.findMany({
    where: and(
      eq(changelogRequests.changelogId, changelogId),
      eq(changelogRequests.organizationId, organizationId),
    ),
    columns: { postId: true },
  });
  if (rows.length === 0) return [];
  const postIds = rows.map((r) => r.postId);
  return db.query.feedbackPosts.findMany({
    where: inArray(feedbackPosts.id, postIds),
    columns: { id: true, title: true, status: true },
  });
}

export async function getOrgMembers(db: Db, organizationId: string) {
  const members = await db.query.member.findMany({
    where: eq(member.organizationId, organizationId),
    columns: { userId: true },
  });
  if (members.length === 0) return [];
  const userIds = members.map((m) => m.userId);
  return db.query.user.findMany({
    where: inArray(user.id, userIds),
    columns: { id: true, name: true, email: true, image: true },
  });
}

const PICKER_PAGE_SIZE = 15;

export async function searchOrgPostsForPicker(
  db: Db,
  organizationId: string,
  search: string,
  offset: number,
) {
  const rows = await db
    .select({ id: feedbackPosts.id, title: feedbackPosts.title, status: feedbackPosts.status })
    .from(feedbackPosts)
    .where(
      and(
        eq(feedbackPosts.organizationId, organizationId),
        isNull(feedbackPosts.mergedIntoPostId),
        search ? ilike(feedbackPosts.title, `%${search}%`) : undefined,
      ),
    )
    .orderBy(desc(feedbackPosts.createdAt))
    .limit(PICKER_PAGE_SIZE + 1)
    .offset(offset);

  return {
    posts: rows.slice(0, PICKER_PAGE_SIZE),
    hasMore: rows.length > PICKER_PAGE_SIZE,
  };
}
