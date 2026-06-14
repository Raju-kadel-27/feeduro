import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackPosts } from "@/db/schema";

export async function getPostMergeInfo(
  organizationId: string,
  postId: string,
  mergedIntoPostId: string | null,
) {
  const db = getDb();

  let mergedIntoPost: { id: string; title: string } | null = null;
  let canUnmerge = false;

  if (mergedIntoPostId) {
    const parent = await db.query.feedbackPosts.findFirst({
      where: eq(feedbackPosts.id, mergedIntoPostId),
      columns: { id: true, title: true, mergedIntoPostId: true },
    });
    if (parent) {
      mergedIntoPost = { id: parent.id, title: parent.title };
      canUnmerge = !parent.mergedIntoPostId;
    }
  }

  const childRows = await db.query.feedbackPosts.findMany({
    where: and(
      eq(feedbackPosts.organizationId, organizationId),
      eq(feedbackPosts.mergedIntoPostId, postId),
    ),
    columns: { id: true, title: true, createdAt: true },
    orderBy: [asc(feedbackPosts.createdAt)],
  });

  return {
    mergedIntoPost,
    mergedChildren: childRows.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
    canUnmerge,
  };
}
