import { getPostTagsBatch } from "@features/feedback/server/tags";
import { getMrrImpactByPost, getVoterTraitCountsByPost } from "@features/internal/segmentation/server/service";
import type { VoterTraitCounts } from "@features/internal/segmentation/types";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { data } from "react-router";
import type { Db } from "@/db";
import { comments, feedbackPosts, user, votes } from "@/db/schema";

const EMPTY_TRAITS: VoterTraitCounts = { plan: {}, role: {}, industry: {}, location: {} };

type PostListFilters = { boardId: string | null; status: string | null };

export async function handleGetPostList(
  db: Db,
  organizationId: string,
  userId: string,
  filters: PostListFilters,
) {
  const conditions = [
    eq(feedbackPosts.organizationId, organizationId),
    isNull(feedbackPosts.mergedIntoPostId),
  ];
  if (filters.boardId) conditions.push(eq(feedbackPosts.boardId, filters.boardId));
  if (filters.status) {
    conditions.push(
      eq(
        feedbackPosts.status,
        filters.status as "open" | "reviewing" | "planned" | "in-progress" | "completed" | "closed",
      ),
    );
  }

  // Fetch visible posts and all merged children for the org in parallel — both only need
  // organizationId, so they can run concurrently instead of sequentially.
  const [posts, allMergedChildren] = await Promise.all([
    db.query.feedbackPosts.findMany({
      where: and(...conditions),
      orderBy: [sql`rank ASC NULLS LAST`, desc(feedbackPosts.createdAt)],
      // searchVector is a stored tsvector (can be large) and aiSummary is detail-only.
      // Excluding them cuts per-post payload significantly on large boards.
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
  const authorIds = [...new Set(posts.map((p) => p.createdBy).filter(Boolean))] as string[];

  // Filter in JS — merged children already fetched for the org, no extra roundtrip needed
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

  const [allVotes, commentCountRows, voterTraitCounts, mrrImpactByPost, postTagRows, authors] =
    await Promise.all([
      allRelevantIds.length > 0
        ? db.query.votes.findMany({
            where: inArray(votes.postId, allRelevantIds),
            columns: { userId: true, postId: true },
          })
        : Promise.resolve([]),
      postIds.length > 0
        ? db
            .select({ postId: comments.postId, count: sql<number>`count(*)`.mapWith(Number) })
            .from(comments)
            .where(inArray(comments.postId, postIds))
            .groupBy(comments.postId)
        : Promise.resolve([]),
      postIds.length > 0
        ? getVoterTraitCountsByPost(db, organizationId, postIds)
        : Promise.resolve({} as Record<string, VoterTraitCounts>),
      allRelevantIds.length > 0
        ? getMrrImpactByPost(db, organizationId, allRelevantIds)
        : Promise.resolve({} as Record<string, number>),
      postIds.length > 0 ? getPostTagsBatch(db, postIds) : Promise.resolve([]),
      authorIds.length > 0
        ? db
            .select({ id: user.id, name: user.name, image: user.image })
            .from(user)
            .where(inArray(user.id, authorIds))
        : Promise.resolve([]),
    ]);

  const commentCountMap = Object.fromEntries(commentCountRows.map((r) => [r.postId, r.count]));
  const authorMap = Object.fromEntries(authors.map((a) => [a.id, { name: a.name, image: a.image }]));
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

  const enriched = posts.map((post) => {
    const idsForPost = [post.id, ...(childMap.get(post.id) ?? [])];
    const voteCount = idsForPost.reduce((sum, id) => sum + (voteCountByPostId.get(id) ?? 0), 0);
    const hasVoted = idsForPost.some((id) => userVotedPostIds.has(id));
    const mrrImpact = idsForPost.reduce((sum, id) => sum + (mrrImpactByPost[id] ?? 0), 0);
    return {
      ...post,
      voteCount,
      hasVoted,
      commentCount: commentCountMap[post.id] ?? 0,
      voterTraitCounts: voterTraitCounts[post.id] ?? EMPTY_TRAITS,
      mrrImpact,
      tagIds: tagsByPost[post.id] ?? [],
      authorName: authorMap[post.createdBy ?? ""]?.name ?? null,
      authorImage: authorMap[post.createdBy ?? ""]?.image ?? null,
    };
  });

  // traitsIncluded distinguishes this payload from loader-seeded cache entries,
  // which ship posts without voterTraitCounts/mrrImpact.
  return data({ posts: enriched, traitsIncluded: true });
}
