import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { CompletedPostsSchema } from "../schemas/analytics";

export async function getCompletedInPeriod(
  db: Db,
  organizationId: string,
  since?: Date,
  limit = 10,
  boardId?: string,
) {
  const sinceFilter = since ? sql`AND pa.created_at >= ${since}` : sql``;
  const boardFilter = boardId ? sql`AND fp.board_id = ${boardId}` : sql``;

  const result = await db.execute(sql`
    SELECT
      fp.id,
      fp.title,
      fp.vote_count   AS "voteCount",
      max(pa.created_at)::date::text AS "completedAt"
    FROM post_activities pa
    JOIN feedback_posts fp ON fp.id = pa.post_id
    WHERE pa.organization_id = ${organizationId}
      AND pa.type = 'status_changed'
      AND pa.new_value = 'completed'
      ${sinceFilter}
      ${boardFilter}
    GROUP BY fp.id, fp.title, fp.vote_count
    ORDER BY max(pa.created_at) DESC
    LIMIT ${limit}
  `);

  return CompletedPostsSchema.parse(result);
}
