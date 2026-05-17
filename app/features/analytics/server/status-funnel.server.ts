import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { StatusFunnelSchema } from "../schemas/analytics";

export async function getStatusFunnel(organizationId: string, boardId?: string) {
  const db = getDb();

  const boardFilter = boardId
    ? sql`AND a1.post_id IN (
        SELECT id FROM feedback_posts
        WHERE board_id = ${boardId} AND organization_id = ${organizationId}
      )`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      a1.new_value                                                               AS "fromStatus",
      a2.new_value                                                               AS "toStatus",
      round(avg(extract(epoch from (a2.created_at - a1.created_at)) / 86400)
            ::numeric, 1)::float                                                AS "avgDays",
      count(*)::int                                                              AS "transitionCount"
    FROM post_activities a1
    INNER JOIN post_activities a2
      ON  a2.post_id          = a1.post_id
      AND a2.created_at       > a1.created_at
      AND a2.organization_id  = a1.organization_id
    WHERE a1.organization_id = ${organizationId}
      AND NOT EXISTS (
        SELECT 1 FROM post_activities a3
        WHERE a3.post_id    = a1.post_id
          AND a3.created_at > a1.created_at
          AND a3.created_at < a2.created_at
      )
      ${boardFilter}
    GROUP BY a1.new_value, a2.new_value
    ORDER BY count(*) DESC
  `);

  return StatusFunnelSchema.parse(result.rows);
}
