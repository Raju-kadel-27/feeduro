import { and, eq, gte, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { feedbackBoards, feedbackPosts } from "@/db/schema";
import { BoardSummarySchema } from "../schemas/analytics";

export async function getBoardSummaries(db: Db, organizationId: string, since?: Date) {
  const joinConditions = [
    eq(feedbackPosts.boardId, feedbackBoards.id),
    eq(feedbackPosts.organizationId, organizationId),
    isNull(feedbackPosts.mergedIntoPostId),
    ...(since ? [gte(feedbackPosts.createdAt, since)] : []),
  ];

  const rows = await db
    .select({
      boardId: feedbackBoards.id,
      boardName: feedbackBoards.name,
      totalPosts: sql<number>`cast(count(${feedbackPosts.id}) as int)`,
      openPosts: sql<number>`cast(count(${feedbackPosts.id}) filter (where ${feedbackPosts.status} = 'open') as int)`,
      resolvedPosts: sql<number>`cast(count(${feedbackPosts.id}) filter (where ${feedbackPosts.status} = 'completed') as int)`,
      totalVotes: sql<number>`cast(coalesce(sum(${feedbackPosts.voteCount}), 0) as int)`,
      avgVotesPerPost: sql<number>`round(coalesce(avg(${feedbackPosts.voteCount}), 0)::numeric, 1)::float`,
      resolutionRate: sql<number>`round(
        case when count(${feedbackPosts.id}) = 0 then 0
        else count(${feedbackPosts.id}) filter (where ${feedbackPosts.status} = 'completed') * 100.0 / count(${feedbackPosts.id})
        end::numeric, 1)::float`,
    })
    .from(feedbackBoards)
    .leftJoin(feedbackPosts, and(...joinConditions))
    .where(eq(feedbackBoards.organizationId, organizationId))
    .groupBy(feedbackBoards.id, feedbackBoards.name)
    .orderBy(sql`count(${feedbackPosts.id}) desc`);

  return rows.map((r) => BoardSummarySchema.parse(r));
}
