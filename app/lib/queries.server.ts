import { getOrgPlanLimits } from "@lib/plan-limits.server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { comments, feedbackBoards, feedbackPosts, votes } from "@/db/schema";

export async function getEnrichedPosts(organizationId: string, userId: string) {
  const db = getDb();

  const posts = await db.query.feedbackPosts.findMany({
    where: eq(feedbackPosts.organizationId, organizationId),
    orderBy: [desc(feedbackPosts.createdAt)],
  });

  const postIds = posts.map((p) => p.id);

  const [allVotes, commentCountRows] = await Promise.all([
    postIds.length > 0
      ? db.query.votes.findMany({ where: eq(votes.organizationId, organizationId) })
      : Promise.resolve([]),
    postIds.length > 0
      ? db
          .select({
            postId: comments.postId,
            count: sql<number>`count(*)`.mapWith(Number),
          })
          .from(comments)
          .where(inArray(comments.postId, postIds))
          .groupBy(comments.postId)
      : Promise.resolve([]),
  ]);

  const commentCountMap = Object.fromEntries(commentCountRows.map((r) => [r.postId, r.count]));

  return posts.map((post) => {
    const postVotes = allVotes.filter((v) => v.postId === post.id);
    return {
      ...post,
      voteCount: postVotes.length,
      hasVoted: postVotes.some((v) => v.userId === userId),
      commentCount: commentCountMap[post.id] ?? 0,
    };
  });
}

export async function getBoards(organizationId: string) {
  const db = getDb();

  const [boards, planLimits, counts, statusRows] = await Promise.all([
    db.query.feedbackBoards.findMany({
      where: eq(feedbackBoards.organizationId, organizationId),
      orderBy: [desc(feedbackBoards.isDefault), desc(feedbackBoards.createdAt)],
    }),
    getOrgPlanLimits(organizationId),
    db
      .select({
        boardId: feedbackPosts.boardId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(feedbackPosts)
      .where(eq(feedbackPosts.organizationId, organizationId))
      .groupBy(feedbackPosts.boardId),
    db
      .select({
        status: feedbackPosts.status,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(feedbackPosts)
      .where(eq(feedbackPosts.organizationId, organizationId))
      .groupBy(feedbackPosts.status),
  ]);

  const countMap = Object.fromEntries(counts.map((r) => [r.boardId, r.count]));
  const statusCounts = Object.fromEntries(statusRows.map((r) => [r.status, r.count]));

  return {
    boards: boards.map((b) => ({ ...b, postCount: countMap[b.id] ?? 0 })),
    statusCounts,
    limit: planLimits.boards,
  };
}
