import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { ResolutionTimeSchema } from "../schemas/health-metrics";

// Avg + median days from post creation to first "completed" status change.
// Uses pa_org_post_created_at_idx for the CTE scan.
export async function getResolutionTime(
  db: Db,
  organizationId: string,
  since?: Date,
  boardId?: string,
) {
  const sinceFilter = since ? sql`AND pa.created_at >= ${since}` : sql``;
  const boardFilter = boardId ? sql`AND fp.board_id = ${boardId}` : sql``;

  const result = await db.execute(sql`
    WITH first_completions AS (
      SELECT DISTINCT ON (pa.post_id)
        pa.post_id,
        pa.created_at AS completed_at
      FROM post_activities pa
      WHERE pa.organization_id = ${organizationId}
        AND pa.type            = 'status_changed'
        AND pa.new_value       = 'completed'
        ${sinceFilter}
      ORDER BY pa.post_id, pa.created_at ASC
    )
    SELECT
      round(
        avg(extract(epoch FROM (fc.completed_at - fp.created_at)) / 86400)::numeric, 1
      )::float   AS "avgDays",
      round(
        percentile_cont(0.5) WITHIN GROUP (
          ORDER BY extract(epoch FROM (fc.completed_at - fp.created_at)) / 86400
        )::numeric, 1
      )::float   AS "medianDays",
      count(*)::int AS "resolvedCount"
    FROM first_completions fc
    JOIN feedback_posts fp ON fp.id = fc.post_id
    WHERE fp.organization_id     = ${organizationId}
      AND fp.merged_into_post_id IS NULL
      ${boardFilter}
  `);

  const row = result.rows[0] ?? { avgDays: null, medianDays: null, resolvedCount: 0 };
  return ResolutionTimeSchema.parse(row);
}
