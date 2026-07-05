import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { ContributorRankSchema } from "../schemas/analytics";

export async function getTopContributors(db: Db, organizationId: string, limit = 10) {
  // Drive from org-scoped activity aggregates so we never touch the global
  // user table beyond the rows that actually have activity in this org.
  const rows = await db.execute(sql`
    WITH vote_agg AS (
      SELECT user_id, count(*)::int AS vote_count
      FROM votes
      WHERE organization_id = ${organizationId}
      GROUP BY user_id
    ),
    post_agg AS (
      SELECT created_by, count(*)::int AS submission_count
      FROM feedback_posts
      WHERE organization_id     = ${organizationId}
        AND merged_into_post_id IS NULL
      GROUP BY created_by
    ),
    active_users AS (
      SELECT user_id AS id FROM vote_agg
      UNION
      SELECT created_by AS id FROM post_agg
    )
    SELECT
      u.id                                                                          AS "userId",
      u.name                                                                        AS "name",
      u.email                                                                       AS "email",
      cast(coalesce(va.vote_count, 0) as int)                                      AS "voteCount",
      cast(coalesce(pa.submission_count, 0) as int)                                AS "submissionCount",
      cast(coalesce(va.vote_count, 0) + coalesce(pa.submission_count, 0) as int)  AS "totalActivity"
    FROM active_users au
    JOIN "user" u  ON u.id  = au.id
    LEFT JOIN vote_agg va  ON va.user_id   = au.id
    LEFT JOIN post_agg pa  ON pa.created_by = au.id
    ORDER BY "totalActivity" DESC
    LIMIT ${limit}
  `);

  return ContributorRankSchema.parse(rows.rows);
}
