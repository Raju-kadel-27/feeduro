import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { AdminActivitySchema } from "../schemas/reports";

export async function getAdminActivity(
  organizationId: string,
  since?: Date,
  limit = 20,
  boardId?: string,
) {
  const db = getDb();

  const sincePostFilter = since ? sql`AND fp.created_at  >= ${since}` : sql``;
  const sinceVoteFilter = since ? sql`AND v.created_at   >= ${since}` : sql``;
  const sinceCommentFilter = since ? sql`AND c.created_at >= ${since}` : sql``;
  const boardPostFilter = boardId ? sql`AND fp.board_id = ${boardId}` : sql``;
  const boardVoteFilter = boardId
    ? sql`AND v.post_id IN (SELECT id FROM feedback_posts WHERE board_id = ${boardId} AND organization_id = ${organizationId})`
    : sql``;
  const boardCommentFilter = boardId
    ? sql`AND c.post_id IN (SELECT id FROM feedback_posts WHERE board_id = ${boardId} AND organization_id = ${organizationId})`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      u.id                                            AS "userId",
      u.name                                          AS "name",
      u.email                                         AS "email",
      m.role                                          AS "role",
      COUNT(DISTINCT fp.id)::int                      AS "postsSubmitted",
      COUNT(DISTINCT v.id)::int                       AS "votesCast",
      COUNT(DISTINCT c.id)::int                       AS "commentsLeft"
    FROM member m
    JOIN "user" u ON u.id = m.user_id
    LEFT JOIN feedback_posts fp
           ON  fp.created_by       = u.id
           AND fp.organization_id  = ${organizationId}
           AND fp.merged_into_post_id IS NULL
           ${sincePostFilter}
           ${boardPostFilter}
    LEFT JOIN votes v
           ON  v.user_id          = u.id
           AND v.organization_id  = ${organizationId}
           ${sinceVoteFilter}
           ${boardVoteFilter}
    LEFT JOIN comments c
           ON  c.user_id          = u.id
           AND c.organization_id  = ${organizationId}
           ${sinceCommentFilter}
           ${boardCommentFilter}
    WHERE m.organization_id = ${organizationId}
    GROUP BY u.id, u.name, u.email, m.role
    ORDER BY (COUNT(DISTINCT fp.id) + COUNT(DISTINCT v.id) + COUNT(DISTINCT c.id)) DESC
    LIMIT ${limit}
  `);

  return AdminActivitySchema.parse(result.rows);
}
