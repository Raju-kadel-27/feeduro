import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import { getVoterTraitCountsByPost } from "@features/internal/segmentation/server/service";
import type { VoterTraitCounts } from "@features/internal/segmentation/types";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { comments, feedbackBoards, feedbackPosts, postExternalLinks, votes } from "@/db/schema";
import { getPostTagsBatch } from "./tags";

const EMPTY_TRAITS: VoterTraitCounts = { plan: {}, role: {}, industry: {}, location: {} };

export async function getEnrichedPosts(organizationId: string, userId: string) {
  const db = getDb();

  const posts = await db.query.feedbackPosts.findMany({
    where: and(
      eq(feedbackPosts.organizationId, organizationId),
      isNull(feedbackPosts.mergedIntoPostId),
    ),
    orderBy: [desc(feedbackPosts.createdAt)],
  });

  const postIds = posts.map((p) => p.id);

  const mergedChildRows =
    postIds.length > 0
      ? await db.query.feedbackPosts.findMany({
          where: and(
            eq(feedbackPosts.organizationId, organizationId),
            inArray(feedbackPosts.mergedIntoPostId, postIds),
          ),
          columns: { id: true, mergedIntoPostId: true },
        })
      : [];

  const childMap = new Map<string, string[]>();
  for (const row of mergedChildRows) {
    if (!row.mergedIntoPostId) continue;
    const arr = childMap.get(row.mergedIntoPostId) ?? [];
    arr.push(row.id);
    childMap.set(row.mergedIntoPostId, arr);
  }

  const allRelevantIds =
    postIds.length > 0 ? [...postIds, ...mergedChildRows.map((r) => r.id)] : [];

  const [allVotes, commentCountRows, voterTraitCounts, githubLinks, postTagRows] = await Promise.all([
    allRelevantIds.length > 0
      ? db.query.votes.findMany({ where: inArray(votes.postId, allRelevantIds) })
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
    postIds.length > 0
      ? getVoterTraitCountsByPost(organizationId, postIds)
      : Promise.resolve({} as Record<string, VoterTraitCounts>),
    postIds.length > 0
      ? db
          .select({
            postId: postExternalLinks.postId,
            externalId: postExternalLinks.externalId,
            externalUrl: postExternalLinks.externalUrl,
          })
          .from(postExternalLinks)
          .where(
            and(
              inArray(postExternalLinks.postId, postIds),
              eq(postExternalLinks.provider, "github"),
            ),
          )
      : Promise.resolve([]),
    postIds.length > 0 ? getPostTagsBatch(postIds) : Promise.resolve([]),
  ]);

  const commentCountMap = Object.fromEntries(commentCountRows.map((r) => [r.postId, r.count]));
  const githubLinkMap = Object.fromEntries(githubLinks.map((l) => [l.postId, l]));
  const tagsByPost: Record<string, string[]> = {};
  for (const row of postTagRows) {
    if (!tagsByPost[row.postId]) tagsByPost[row.postId] = [];
    tagsByPost[row.postId].push(row.id);
  }

  return posts.map((post) => {
    const idsForPost = new Set([post.id, ...(childMap.get(post.id) ?? [])]);
    const postVotes = allVotes.filter((v) => idsForPost.has(v.postId));
    const githubLink = githubLinkMap[post.id];
    return {
      ...post,
      voteCount: postVotes.length,
      hasVoted: postVotes.some((v) => v.userId === userId),
      commentCount: commentCountMap[post.id] ?? 0,
      voterTraitCounts: voterTraitCounts[post.id] ?? EMPTY_TRAITS,
      tagIds: tagsByPost[post.id] ?? [],
      githubIssueNumber: githubLink ? Number(githubLink.externalId) : null,
      githubIssueUrl: githubLink?.externalUrl ?? null,
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
