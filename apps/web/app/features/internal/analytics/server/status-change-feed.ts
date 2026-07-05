import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { StatusChangeFeedSchema } from "../schemas/analytics";

export async function getStatusChangeFeed(
  db: Db,
  organizationId: string,
  since?: Date,
  boardId?: string,
  limit = 25,
) {
  const sinceFilter = since ? sql`AND pa.created_at >= ${since}` : sql``;
  const boardFilter = boardId ? sql`AND fp.board_id = ${boardId}` : sql``;

  const result = await db.execute(sql`
    SELECT
      fp.id                       AS "postId",
      fp.title                    AS "postTitle",
      fb.name                     AS "boardName",
      pa.old_value                AS "fromStatus",
      pa.new_value                AS "toStatus",
      u.name                      AS "actorName",
      u.email                     AS "actorEmail",
      pa.created_at::text         AS "changedAt"
    FROM post_activities pa
    JOIN feedback_posts fp  ON fp.id = pa.post_id
    JOIN feedback_boards fb ON fb.id = fp.board_id
    LEFT JOIN "user" u       ON u.id  = pa.user_id
    WHERE pa.organization_id = ${organizationId}
      AND pa.type = 'status_changed'
      ${sinceFilter}
      ${boardFilter}
    ORDER BY pa.created_at DESC
    LIMIT ${limit}
  `);

  return StatusChangeFeedSchema.parse(result.rows);
}
