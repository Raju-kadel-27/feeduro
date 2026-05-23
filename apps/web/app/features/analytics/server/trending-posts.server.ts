import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { TrendingPostsSchema } from "../schemas/analytics";

export async function getTrendingPosts(organizationId: string, limit = 8) {
  const db = getDb();

  const result = await db.execute(sql`
    SELECT
      fp.id,
      fp.title,
      fp.status,
      fp.vote_count                              AS "totalVotes",
      COALESCE(v.votes_this_week, 0)             AS "votesThisWeek",
      COALESCE(v.votes_last_week, 0)             AS "votesLastWeek"
    FROM feedback_posts fp
    LEFT JOIN (
      SELECT
        post_id,
        SUM(CASE WHEN created_at >= now() - interval '7 days'  THEN 1 ELSE 0 END)::int  AS votes_this_week,
        SUM(CASE WHEN created_at <  now() - interval '7 days'  THEN 1 ELSE 0 END)::int  AS votes_last_week
      FROM votes
      WHERE organization_id = ${organizationId}
        AND created_at >= now() - interval '14 days'
      GROUP BY post_id
    ) v ON v.post_id = fp.id
    WHERE fp.organization_id      = ${organizationId}
      AND fp.merged_into_post_id IS NULL
      AND fp.status NOT IN ('completed', 'closed')
      AND COALESCE(v.votes_this_week, 0) > 0
    ORDER BY v.votes_this_week DESC NULLS LAST
    LIMIT ${limit}
  `);

  return TrendingPostsSchema.parse(result.rows);
}
