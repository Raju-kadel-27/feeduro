import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { ResponseRateSchema } from "../schemas/health-metrics";

// % of posts that received at least one public team-member comment,
// and the average hours to first response.
// "Team member" = any user who is a member of the org (member table).
export async function getResponseRate(
  db: Db,
  organizationId: string,
  since?: Date,
  boardId?: string,
) {
  const sinceFilter = since ? sql`AND fp.created_at >= ${since}` : sql``;
  // Push the period boundary into the CTE — posts in the period can only have
  // responses after `since`, so this is safe and avoids a full comments scan.
  const sinceCommentFilter = since ? sql`AND c.created_at >= ${since}` : sql``;
  const boardFilter = boardId ? sql`AND fp.board_id = ${boardId}` : sql``;

  const result = await db.execute(sql`
    WITH team_members AS (
      SELECT user_id FROM member WHERE organization_id = ${organizationId}
    ),
    first_team_comment AS (
      SELECT DISTINCT ON (c.post_id)
        c.post_id,
        c.created_at AS first_response_at
      FROM comments c
      JOIN team_members tm ON tm.user_id = c.user_id
      WHERE c.organization_id = ${organizationId}
        AND c.is_internal     = false
        ${sinceCommentFilter}
      ORDER BY c.post_id, c.created_at ASC
    )
    SELECT
      count(DISTINCT fp.id)::int                                        AS "totalPosts",
      count(DISTINCT ftc.post_id)::int                                  AS "respondedPosts",
      round(
        (count(DISTINCT ftc.post_id) * 100.0
          / NULLIF(count(DISTINCT fp.id), 0))::numeric, 1
      )::float                                                          AS "responseRate",
      round(
        avg(extract(epoch FROM (ftc.first_response_at - fp.created_at))
          / 3600)::numeric, 1
      )::float                                                          AS "avgFirstResponseHours"
    FROM feedback_posts fp
    LEFT JOIN first_team_comment ftc ON ftc.post_id = fp.id
    WHERE fp.organization_id     = ${organizationId}
      AND fp.merged_into_post_id IS NULL
      ${sinceFilter}
      ${boardFilter}
  `);

  const row = result.rows[0] ?? {
    totalPosts: 0,
    respondedPosts: 0,
    responseRate: null,
    avgFirstResponseHours: null,
  };
  return ResponseRateSchema.parse(row);
}
