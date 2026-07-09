import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { StatusFunnelSchema } from "../schemas/analytics";

export async function getStatusFunnel(
  db: Db,
  organizationId: string,
  boardId?: string,
  since?: Date,
) {
  const boardFilter = boardId
    ? sql`AND pa.post_id IN (
        SELECT id FROM feedback_posts
        WHERE board_id = ${boardId} AND organization_id = ${organizationId}
      )`
    : sql``;

  const sinceFilter = since ? sql`AND pa.created_at >= ${since}` : sql``;

  const result = await db.execute(sql`
    WITH transitions AS (
      SELECT
        new_value                                                             AS "fromStatus",
        LEAD(new_value)  OVER (PARTITION BY post_id ORDER BY created_at)     AS "toStatus",
        LEAD(created_at) OVER (PARTITION BY post_id ORDER BY created_at)     AS "nextAt",
        created_at                                                            AS "thisAt"
      FROM post_activities pa
      WHERE pa.organization_id = ${organizationId}
        AND pa.type = 'status_changed'
        ${boardFilter}
        ${sinceFilter}
    )
    SELECT
      "fromStatus",
      "toStatus",
      round(avg(extract(epoch from ("nextAt" - "thisAt")) / 86400)::numeric, 1)::float AS "avgDays",
      count(*)::int                                                                     AS "transitionCount"
    FROM transitions
    WHERE "toStatus" IS NOT NULL
    GROUP BY "fromStatus", "toStatus"
    ORDER BY count(*) DESC
  `);

  return StatusFunnelSchema.parse(result);
}
