import { getPostCoreData } from "@features/feedback/server/post-detail-core";
import { getPostIntegrationLinks } from "@features/feedback/server/post-integration-links";
import { getPostMergeInfo } from "@features/feedback/server/post-merge-info";
import { inArray, sql } from "drizzle-orm";
import { data } from "react-router";
import type { Db } from "@/db";
import { votes } from "@/db/schema";

export async function handleGetPostDetail(
  db: Db,
  organizationId: string,
  postId: string,
  userId: string,
) {
  const coreData = await getPostCoreData(db, organizationId, postId, userId);
  if (!coreData) return data(null, { status: 404 });

  const {
    post,
    board,
    voteCountRow,
    currentVote,
    reactionCountRows,
    myReactionRows,
    authorRow,
    memberRecord,
    ownerRow,
    orgAdminRows,
  } = coreData;

  const [integrationLinks, mergeInfo] = await Promise.all([
    getPostIntegrationLinks(db, organizationId, postId),
    getPostMergeInfo(db, organizationId, postId, post.mergedIntoPostId ?? null),
  ]);

  let totalVoteCount = voteCountRow[0]?.count ?? 0;
  if (mergeInfo.mergedChildren.length > 0) {
    const childIds = mergeInfo.mergedChildren.map((c) => c.id);
    const [childVoteRow] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(votes)
      .where(inArray(votes.postId, childIds));
    totalVoteCount += childVoteRow?.count ?? 0;
  }

  const reactionCountMap = Object.fromEntries(reactionCountRows.map((r) => [r.type, r.count]));
  const myReactionSet = new Set(myReactionRows.map((r) => r.type));

  return data({
    postDetail: {
      ...post,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      voteCount: totalVoteCount,
      hasVoted: !!currentVote,
      reactionCounts: reactionCountMap as Record<string, number>,
      myReactions: [...myReactionSet] as string[],
      authorName: authorRow?.name ?? authorRow?.email ?? "Unknown",
      authorImage: authorRow?.image ?? null,
      aiSummary: post.aiSummary ?? null,
      aiSummaryGeneratedAt: post.aiSummaryGeneratedAt?.toISOString() ?? null,
      ownerId: post.ownerId ?? null,
      ownerName: ownerRow?.name ?? null,
      ownerImage: ownerRow?.image ?? null,
    },
    board: {
      name: board?.name ?? "General",
      slug: board?.slug ?? "general",
      visibility: board?.visibility ?? "public",
    },
    currentRole: memberRecord?.role ?? "member",
    ...integrationLinks,
    ...mergeInfo,
    orgAdmins: orgAdminRows,
  });
}
