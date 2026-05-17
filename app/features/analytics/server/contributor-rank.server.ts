import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { ContributorRankSchema } from "../schemas/analytics";

export async function getTopContributors(organizationId: string, limit = 10) {
  const db = getDb();

  const rows = await db.execute(sql`
    SELECT
      u.id                                        AS "userId",
      u.name                                      AS "name",
      u.email                                     AS "email",
      cast(coalesce(v.vote_count, 0) as int)      AS "voteCount",
      cast(coalesce(p.submission_count, 0) as int) AS "submissionCount",
      cast(coalesce(v.vote_count, 0) + coalesce(p.submission_count, 0) as int) AS "totalActivity"
    FROM "user" u
    LEFT JOIN (
      SELECT user_id, count(*) AS vote_count
      FROM votes
      WHERE organization_id = ${organizationId}
      GROUP BY user_id
    ) v ON v.user_id = u.id
    LEFT JOIN (
      SELECT created_by, count(*) AS submission_count
      FROM feedback_posts
      WHERE organization_id = ${organizationId}
      GROUP BY created_by
    ) p ON p.created_by = u.id
    WHERE (coalesce(v.vote_count, 0) + coalesce(p.submission_count, 0)) > 0
    ORDER BY "totalActivity" DESC
    LIMIT ${limit}
  `);

  return ContributorRankSchema.parse(rows.rows);
}
