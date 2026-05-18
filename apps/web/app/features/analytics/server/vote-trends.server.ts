import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackPosts, votes } from "@/db/schema";
import { VoteTrendsSchema } from "../schemas/analytics";

export async function getVoteTrends(organizationId: string, postId: string, days = 30) {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [post, trend] = await Promise.all([
    db.query.feedbackPosts.findFirst({
      where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
      columns: { id: true, title: true, voteCount: true },
    }),
    db
      .select({
        date: sql<string>`date_trunc('day', ${votes.createdAt})::date::text`,
        voteCount: sql<number>`cast(count(*) as int)`,
      })
      .from(votes)
      .where(
        and(
          eq(votes.postId, postId),
          eq(votes.organizationId, organizationId),
          gte(votes.createdAt, since),
        ),
      )
      .groupBy(sql`date_trunc('day', ${votes.createdAt})`)
      .orderBy(sql`date_trunc('day', ${votes.createdAt})`),
  ]);

  if (!post) return null;

  return VoteTrendsSchema.parse({
    postId: post.id,
    postTitle: post.title,
    totalVotes: post.voteCount ?? 0,
    trend,
  });
}

export async function getTopPostsByVotes(organizationId: string, boardId?: string, limit = 10) {
  const db = getDb();

  const conditions = [eq(feedbackPosts.organizationId, organizationId)];
  if (boardId) conditions.push(eq(feedbackPosts.boardId, boardId));

  return db.query.feedbackPosts.findMany({
    where: and(...conditions),
    columns: { id: true, title: true, status: true, voteCount: true, createdAt: true },
    orderBy: [desc(feedbackPosts.voteCount)],
    limit,
  });
}
