import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { VoteConversionSchema } from "../schemas/health-metrics";

// Unique voters / unique board visitors in the period.
// Directional signal — visitors are anonymous, voters are authenticated.
// Uses bv_org_created_at_idx and votes_org_created_at_idx.
export async function getVoteConversion(db: Db, organizationId: string, since?: Date) {
  const sinceFilter = since ? sql`AND created_at >= ${since}` : sql``;

  const result = await db.execute(sql`
    WITH visitors AS (
      SELECT count(DISTINCT visitor_hash)::int AS cnt
      FROM board_views
      WHERE organization_id = ${organizationId}
        ${sinceFilter}
    ),
    voters AS (
      SELECT count(DISTINCT user_id)::int AS cnt
      FROM votes
      WHERE organization_id = ${organizationId}
        ${sinceFilter}
    )
    SELECT
      visitors.cnt                                                          AS "uniqueVisitors",
      voters.cnt                                                            AS "uniqueVoters",
      round(
        (voters.cnt * 100.0 / NULLIF(visitors.cnt, 0))::numeric, 1
      )::float                                                              AS "conversionRate"
    FROM visitors, voters
  `);

  const row = result[0] ?? { uniqueVisitors: 0, uniqueVoters: 0, conversionRate: null };
  return VoteConversionSchema.parse(row);
}
