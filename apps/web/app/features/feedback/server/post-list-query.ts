import { getPostTagsBatch } from "@features/feedback/server/tags";
import { getMrrImpactByPost, getVoterTraitCountsByPost } from "@features/internal/segmentation/server/service";
import type { VoterTraitCounts } from "@features/internal/segmentation/types";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { comments, feedbackPosts, user, votes } from "@/db/schema";

const EMPTY_TRAITS: VoterTraitCounts = { plan: {}, role: {}, industry: {}, location: {} };

type PostListFilters = { boardId: string | null; status: string | null };

export async function handleGetPostList(
  organizationId: string,
  userId: string,
  filters: PostListFilters,
) {
  const db = getDb();

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

  const posts = await db.query.feedbackPosts.findMany({
    where: and(...conditions),
    orderBy: [sql`rank ASC NULLS LAST`, desc(feedbackPosts.createdAt)],
  });

  const postIds = posts.map((p) => p.id);
  const authorIds = [...new Set(posts.map((p) => p.createdBy).filter(Boolean))] as string[];

  // Fetch posts merged into any visible post so their votes are counted on the parent.
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

  const [allVotes, commentCountRows, voterTraitCounts, mrrImpactByPost, postTagRows, authors] =
    await Promise.all([
      allRelevantIds.length > 0
        ? db.query.votes.findMany({ where: inArray(votes.postId, allRelevantIds) })
        : Promise.resolve([]),
      postIds.length > 0
        ? db
            .select({ postId: comments.postId, count: sql<number>`count(*)`.mapWith(Number) })
            .from(comments)
            .where(inArray(comments.postId, postIds))
            .groupBy(comments.postId)
        : Promise.resolve([]),
      postIds.length > 0
        ? getVoterTraitCountsByPost(organizationId, postIds)
        : Promise.resolve({} as Record<string, VoterTraitCounts>),
      allRelevantIds.length > 0
        ? getMrrImpactByPost(organizationId, allRelevantIds)
        : Promise.resolve({} as Record<string, number>),
      postIds.length > 0 ? getPostTagsBatch(postIds) : Promise.resolve([]),
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

  const enriched = posts.map((post) => {
    const idsForPost = new Set([post.id, ...(childMap.get(post.id) ?? [])]);
    const postVotes = allVotes.filter((v) => idsForPost.has(v.postId));
    const mrrImpact = [...idsForPost].reduce((sum, id) => sum + (mrrImpactByPost[id] ?? 0), 0);
    return {
      ...post,
      voteCount: postVotes.length,
      hasVoted: postVotes.some((v) => v.userId === userId),
      commentCount: commentCountMap[post.id] ?? 0,
      voterTraitCounts: voterTraitCounts[post.id] ?? EMPTY_TRAITS,
      mrrImpact,
      tagIds: tagsByPost[post.id] ?? [],
      authorName: authorMap[post.createdBy ?? ""]?.name ?? null,
      authorImage: authorMap[post.createdBy ?? ""]?.image ?? null,
    };
  });

  return data({ posts: enriched });
}
