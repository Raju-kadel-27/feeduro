import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { MergeRateSchema } from "../schemas/health-metrics";

// % of posts that were merged into another post (duplicates removed by admin).
// High rate = users can't find existing posts before submitting.
export async function getMergeRate(
  db: Db,
  organizationId: string,
  since?: Date,
  boardId?: string,
) {
  const sinceFilter = since ? sql`AND created_at >= ${since}` : sql``;
  const boardFilter = boardId ? sql`AND board_id = ${boardId}` : sql``;

  const result = await db.execute(sql`
    SELECT
      count(*)::int                                                          AS "totalPosts",
      count(*) FILTER (WHERE merged_into_post_id IS NOT NULL)::int          AS "mergedPosts",
      round(
        (count(*) FILTER (WHERE merged_into_post_id IS NOT NULL) * 100.0
          / NULLIF(count(*), 0))::numeric, 1
      )::float                                                               AS "mergeRate"
    FROM feedback_posts
    WHERE organization_id = ${organizationId}
      ${sinceFilter}
      ${boardFilter}
  `);

  const row = result.rows[0] ?? { totalPosts: 0, mergedPosts: 0, mergeRate: null };
  return MergeRateSchema.parse(row);
}
