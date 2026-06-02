import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { SubscriberMetricsSchema } from "../schemas/health-metrics";

// Changelog subscriber counts: active, unsubscribed, and new in the last 30 days
// (or the selected date range when `since` is provided).
// Uses cls_org_id_idx.
export async function getSubscriberMetrics(organizationId: string, since?: Date) {
  const db = getDb();
  const newSince = since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const result = await db.execute(sql`
    SELECT
      count(*) FILTER (WHERE unsubscribed_at IS NULL)::int                         AS "activeSubscribers",
      count(*) FILTER (WHERE unsubscribed_at IS NULL
                         AND subscribed_at >= ${newSince})::int                    AS "newSubscribers",
      count(*) FILTER (WHERE unsubscribed_at IS NOT NULL)::int                     AS "unsubscribed",
      count(*)::int                                                                 AS "totalSubscribers"
    FROM changelog_subscribers
    WHERE organization_id = ${organizationId}
  `);

  const row = result.rows[0] ?? {
    activeSubscribers: 0, newSubscribers: 0, unsubscribed: 0, totalSubscribers: 0,
  };
  return SubscriberMetricsSchema.parse(row);
}
