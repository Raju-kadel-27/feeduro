import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { BacklogAgingSchema } from "../schemas/health-metrics";

// Age-bucket distribution of open (non-completed, non-closed) posts.
// Uses fp_org_status_idx (organization_id, status) for the scan.
export async function getBacklogAging(db: Db, organizationId: string, boardId?: string) {
  const boardFilter = boardId ? sql`AND board_id = ${boardId}` : sql``;

  const result = await db.execute(sql`
    SELECT
      count(*) FILTER (WHERE age_days <= 7)::int                AS "bucket0to7",
      count(*) FILTER (WHERE age_days BETWEEN 8  AND 30)::int   AS "bucket8to30",
      count(*) FILTER (WHERE age_days BETWEEN 31 AND 90)::int   AS "bucket31to90",
      count(*) FILTER (WHERE age_days > 90)::int                AS "bucket90plus",
      count(*)::int                                              AS "total"
    FROM (
      SELECT extract(epoch FROM (now() - created_at)) / 86400 AS age_days
      FROM feedback_posts
      WHERE organization_id     = ${organizationId}
        AND merged_into_post_id IS NULL
        AND status NOT IN ('completed', 'closed')
        ${boardFilter}
    ) sub
  `);

  const row = result[0] ?? {
    bucket0to7: 0, bucket8to30: 0, bucket31to90: 0, bucket90plus: 0, total: 0,
  };
  return BacklogAgingSchema.parse(row);
}
