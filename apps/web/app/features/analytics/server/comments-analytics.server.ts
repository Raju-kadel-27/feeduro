import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { CommentsAnalyticsSchema } from "../schemas/analytics";

const CountsSchema = z.object({
  currentComments: z.number(),
  prevComments: z.number().nullable(),
});

function pct(current: number, prev: number | null): number | null {
  if (prev == null || prev === 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}

export async function getCommentsAnalytics(organizationId: string, since?: Date) {
  const db = getDb();

  const nowMs = Date.now();
  const prevSince = since ? new Date(since.getTime() - (nowMs - since.getTime())) : null;

  const sinceFilter = since ? sql`AND c.created_at >= ${since}` : sql``;
  const prevFilter =
    since && prevSince
      ? sql`AND c.created_at >= ${prevSince} AND c.created_at < ${since}`
      : null;

  const [countsResult, postsResult] = await Promise.all([
    // total comments this period + previous period for delta
    db.execute(sql`
      SELECT
        COUNT(CASE WHEN TRUE ${sinceFilter} THEN 1 END)::int AS "currentComments",
        ${prevFilter ? sql`COUNT(CASE WHEN TRUE ${prevFilter} THEN 1 END)::int` : sql`NULL`} AS "prevComments"
      FROM comments c
      WHERE c.organization_id = ${organizationId}
    `),
    // top posts by comment count in the period
    db.execute(sql`
      SELECT
        fp.id,
        fp.title,
        fp.status,
        COUNT(c.id)::int AS "commentCount"
      FROM feedback_posts fp
      INNER JOIN comments c
        ON  c.post_id         = fp.id
        AND c.organization_id = ${organizationId}
        ${sinceFilter}
      WHERE fp.organization_id     = ${organizationId}
        AND fp.merged_into_post_id IS NULL
      GROUP BY fp.id, fp.title, fp.status
      ORDER BY COUNT(c.id) DESC
      LIMIT 8
    `),
  ]);

  const { currentComments, prevComments } = CountsSchema.parse(countsResult.rows[0]);

  return CommentsAnalyticsSchema.parse({
    totalComments: currentComments,
    delta: pct(currentComments, prevComments),
    topPosts: postsResult.rows,
  });
}
