import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import type { VoterTraitCounts } from "@features/internal/segmentation/types";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { comments, feedbackBoards, feedbackPosts, postExternalLinks, votes } from "@/db/schema";
import { getPostTagsBatch } from "./tags";

const EMPTY_TRAITS: VoterTraitCounts = { plan: {}, role: {}, industry: {}, location: {} };

export async function getEnrichedPosts(db: Db, organizationId: string, userId: string) {
  // Fetch top-level posts and merged children in parallel — both only need organizationId,
  // removing a sequential roundtrip that was adding ~150ms in production.
  const [posts, allMergedChildren] = await Promise.all([
    db.query.feedbackPosts.findMany({
      where: and(
        eq(feedbackPosts.organizationId, organizationId),
        isNull(feedbackPosts.mergedIntoPostId),
      ),
      orderBy: [desc(feedbackPosts.createdAt)],
      columns: { searchVector: false, aiSummary: false, description: false },
      extras: {
        // List rows only render a line-clamped snippet; the detail panel fetches
        // the full text. Truncating here bounds the per-post payload.
        description: sql<string | null>`left(${feedbackPosts.description}, 300)`.as("description"),
      },
    }),
    db.query.feedbackPosts.findMany({
      where: and(
        eq(feedbackPosts.organizationId, organizationId),
        isNotNull(feedbackPosts.mergedIntoPostId),
      ),
      columns: { id: true, mergedIntoPostId: true },
    }),
  ]);

  const postIds = posts.map((p) => p.id);
  const postIdSet = new Set(postIds);

  // Filter in JS — no extra roundtrip needed since we fetched all merged children for the org already
  const mergedChildRows = allMergedChildren.filter(
    (r) => r.mergedIntoPostId !== null && postIdSet.has(r.mergedIntoPostId),
  );

  const childMap = new Map<string, string[]>();
  for (const row of mergedChildRows) {
    if (!row.mergedIntoPostId) continue;
    const arr = childMap.get(row.mergedIntoPostId) ?? [];
    arr.push(row.id);
    childMap.set(row.mergedIntoPostId, arr);
  }

  const allRelevantIds =
    postIds.length > 0 ? [...postIds, ...mergedChildRows.map((r) => r.id)] : [];

  // voterTraitCounts is deferred — expensive double JOIN that is not needed for the initial list
  // render. The dashboard's TanStack query refetches /api/feedback with full traits in the background.
  const [allVotes, commentCountRows, githubLinks, postTagRows] = await Promise.all([
    allRelevantIds.length > 0
      ? db.query.votes.findMany({
          where: inArray(votes.postId, allRelevantIds),
          columns: { userId: true, postId: true },
        })
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
    postIds.length > 0 ? getPostTagsBatch(db, postIds) : Promise.resolve([]),
  ]);

  const commentCountMap = Object.fromEntries(commentCountRows.map((r) => [r.postId, r.count]));
  const githubLinkMap = Object.fromEntries(githubLinks.map((l) => [l.postId, l]));
  const tagsByPost: Record<string, string[]> = {};
  for (const row of postTagRows) {
    if (!tagsByPost[row.postId]) tagsByPost[row.postId] = [];
    tagsByPost[row.postId].push(row.id);
  }

  // Pre-build vote maps to avoid an O(posts × votes) filter loop below.
  const voteCountByPostId = new Map<string, number>();
  const userVotedPostIds = new Set<string>();
  for (const v of allVotes) {
    voteCountByPostId.set(v.postId, (voteCountByPostId.get(v.postId) ?? 0) + 1);
    if (v.userId === userId) userVotedPostIds.add(v.postId);
  }

  return posts.map((post) => {
    const idsForPost = [post.id, ...(childMap.get(post.id) ?? [])];
    const githubLink = githubLinkMap[post.id];
    return {
      ...post,
      voteCount: idsForPost.reduce((sum, id) => sum + (voteCountByPostId.get(id) ?? 0), 0),
      hasVoted: idsForPost.some((id) => userVotedPostIds.has(id)),
      commentCount: commentCountMap[post.id] ?? 0,
      voterTraitCounts: EMPTY_TRAITS,
      tagIds: tagsByPost[post.id] ?? [],
      githubIssueNumber: githubLink ? Number(githubLink.externalId) : null,
      githubIssueUrl: githubLink?.externalUrl ?? null,
    };
  });
}

export async function getBoards(db: Db, organizationId: string) {
  const [boards, planLimits, counts, statusRows] = await Promise.all([
    db.query.feedbackBoards.findMany({
      where: eq(feedbackBoards.organizationId, organizationId),
      orderBy: [desc(feedbackBoards.isDefault), desc(feedbackBoards.createdAt)],
    }),
    getOrgPlanLimits(db, organizationId),
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
      .where(
        and(
          eq(feedbackPosts.organizationId, organizationId),
          // merged children are hidden from every list — don't count them
          isNull(feedbackPosts.mergedIntoPostId),
        ),
      )
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
