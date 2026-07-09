import { sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { BoardVisitorsSchema } from "../schemas/analytics";

const SummarySchema = z.object({
  chart: BoardVisitorsSchema,
  totalViews: z.number(),
  uniqueVisitors: z.number(),
});

export type RoadmapVisitors7d = z.infer<typeof SummarySchema>;

export async function getRoadmapVisitorsLast7Days(
  db: Db,
  organizationId: string,
): Promise<RoadmapVisitors7d> {
  const result = await db.execute(sql`
    WITH days AS (
      SELECT generate_series(
        (now() - interval '6 days')::date,
        now()::date,
        interval '1 day'
      )::date AS day
    ),
    stats AS (
      SELECT
        created_at::date                    AS day,
        COUNT(DISTINCT visitor_hash)::int   AS "uniqueVisitors",
        COUNT(*)::int                       AS "totalViews"
      FROM portal_events
      WHERE organization_id = ${organizationId}
        AND created_at >= now() - interval '7 days'
        AND type = 'roadmap_view'
      GROUP BY created_at::date
    )
    SELECT
      days.day::text                              AS "period",
      COALESCE(stats."uniqueVisitors", 0)::int   AS "uniqueVisitors",
      COALESCE(stats."totalViews", 0)::int       AS "totalViews"
    FROM days
    LEFT JOIN stats ON stats.day = days.day
    ORDER BY days.day
  `);

  const chart = BoardVisitorsSchema.parse(result);
  const totalViews = chart.reduce((s, d) => s + d.totalViews, 0);
  const uniqueVisitors = chart.reduce((s, d) => s + d.uniqueVisitors, 0);

  return SummarySchema.parse({ chart, totalViews, uniqueVisitors });
}
