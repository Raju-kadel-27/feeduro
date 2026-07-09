import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { ChangelogEngagementSchema } from "../schemas/reports";

export async function getChangelogEngagement(db: Db, organizationId: string, limit = 20) {
  const result = await db.execute(sql`
    SELECT
      cl.id                                           AS "changelogId",
      cl.title                                        AS "title",
      cl.published_at::date::text                     AS "publishedAt",
      COUNT(cv.id)::int                               AS "totalViews",
      COUNT(DISTINCT cv.visitor_hash)::int            AS "uniqueReaders"
    FROM changelogs cl
    LEFT JOIN portal_events cv ON cv.resource_id = cl.id AND cv.type = 'changelog_view'
    WHERE cl.organization_id = ${organizationId}
      AND cl.status = 'published'
    GROUP BY cl.id, cl.title, cl.published_at
    ORDER BY cl.published_at DESC NULLS LAST
    LIMIT ${limit}
  `);

  return ChangelogEngagementSchema.parse(result);
}
