import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackPosts, votes } from "@/db/schema";
import { VoteTrendsSchema } from "../schemas/analytics";
import { TopPostsSchema } from "../schemas/reports";

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

export async function getTopPostsByVotes(
  organizationId: string,
  boardId?: string,
  limit = 10,
  since?: Date,
) {
  const db = getDb();

  const boardFilter = boardId ? sql`AND fp.board_id = ${boardId}` : sql``;
  const sinceFilter = since ? sql`AND fp.created_at >= ${since}` : sql``;

  const result = await db.execute(sql`
    SELECT
      fp.id,
      fp.title,
      fp.status,
      fp.vote_count                                             AS "voteCount",
      COUNT(DISTINCT SPLIT_PART(u.email, '@', 2))::int         AS "uniqueCompanies"
    FROM feedback_posts fp
    LEFT JOIN votes v  ON  v.post_id = fp.id
    LEFT JOIN "user" u ON  u.id = v.user_id
    WHERE fp.organization_id    = ${organizationId}
      AND fp.merged_into_post_id IS NULL
      ${boardFilter}
      ${sinceFilter}
    GROUP BY fp.id, fp.title, fp.status, fp.vote_count
    ORDER BY fp.vote_count DESC
    LIMIT ${limit}
  `);

  return TopPostsSchema.parse(result.rows);
}
