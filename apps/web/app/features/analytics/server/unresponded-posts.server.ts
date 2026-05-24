import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { UnrespondedPostsSchema } from "../schemas/analytics";

// Posts still 'open' after this many days are considered unresponded
const THRESHOLD_DAYS = 30;

export async function getUnrespondedPosts(organizationId: string) {
  const db = getDb();

  // Uses fp_org_status_idx (organization_id, status) to filter efficiently;
  // created_at range check eliminates posts newer than the threshold
  const result = await db.execute(sql`
    SELECT
      fp.id,
      fp.title,
      fp.vote_count                                              AS "voteCount",
      EXTRACT(epoch FROM (now() - fp.created_at))::int / 86400  AS "daysOpen"
    FROM feedback_posts fp
    WHERE fp.organization_id     = ${organizationId}
      AND fp.status              = 'open'
      AND fp.merged_into_post_id IS NULL
      AND fp.created_at         <= now() - (${THRESHOLD_DAYS} || ' days')::interval
    ORDER BY fp.vote_count DESC, fp.created_at ASC
    LIMIT 10
  `);

  return UnrespondedPostsSchema.parse(result.rows);
}
