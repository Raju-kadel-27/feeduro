import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import type { StatsDelta } from "../schemas/analytics";

const RawSchema = z.object({
  currentPosts: z.number(),
  currentVotes: z.number(),
  currentResolved: z.number(),
  prevPosts: z.number(),
  prevVotes: z.number(),
  prevResolved: z.number(),
});

function pct(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}

export async function getPeriodDeltas(
  organizationId: string,
  since: Date,
): Promise<StatsDelta> {
  const db = getDb();

  // Previous window mirrors the current window shifted back by the same duration
  const nowMs = Date.now();
  const windowMs = nowMs - since.getTime();
  const prevSince = new Date(since.getTime() - windowMs);

  // Six scalar subqueries in one round-trip; all benefit from the
  // (organization_id, created_at) indexes on feedback_posts and votes
  const result = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM feedback_posts
       WHERE organization_id = ${organizationId}
         AND merged_into_post_id IS NULL
         AND created_at >= ${since})                                  AS "currentPosts",

      (SELECT COUNT(*)::int FROM votes
       WHERE organization_id = ${organizationId}
         AND created_at >= ${since})                                  AS "currentVotes",

      (SELECT COUNT(*)::int FROM feedback_posts
       WHERE organization_id = ${organizationId}
         AND merged_into_post_id IS NULL
         AND status = 'completed'
         AND created_at >= ${since})                                  AS "currentResolved",

      (SELECT COUNT(*)::int FROM feedback_posts
       WHERE organization_id = ${organizationId}
         AND merged_into_post_id IS NULL
         AND created_at >= ${prevSince}
         AND created_at < ${since})                                   AS "prevPosts",

      (SELECT COUNT(*)::int FROM votes
       WHERE organization_id = ${organizationId}
         AND created_at >= ${prevSince}
         AND created_at < ${since})                                   AS "prevVotes",

      (SELECT COUNT(*)::int FROM feedback_posts
       WHERE organization_id = ${organizationId}
         AND merged_into_post_id IS NULL
         AND status = 'completed'
         AND created_at >= ${prevSince}
         AND created_at < ${since})                                   AS "prevResolved"
  `);

  const row = RawSchema.parse(result.rows[0]);

  const currentAvg =
    row.currentPosts > 0
      ? Math.round((row.currentVotes / row.currentPosts) * 10) / 10
      : 0;
  const prevAvg =
    row.prevPosts > 0
      ? Math.round((row.prevVotes / row.prevPosts) * 10) / 10
      : 0;

  const currentRate =
    row.currentPosts > 0
      ? Math.round((row.currentResolved / row.currentPosts) * 100)
      : 0;
  const prevRate =
    row.prevPosts > 0
      ? Math.round((row.prevResolved / row.prevPosts) * 100)
      : 0;

  return {
    posts: pct(row.currentPosts, row.prevPosts),
    votes: pct(row.currentVotes, row.prevVotes),
    resolutionRate: pct(currentRate, prevRate),
    avgVotesPerPost: pct(currentAvg, prevAvg),
  };
}
