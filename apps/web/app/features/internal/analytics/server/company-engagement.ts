import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { CompanyEngagementSchema } from "../schemas/reports";

export async function getCompanyEngagement(
  db: Db,
  organizationId: string,
  since?: Date,
  limit = 20,
  boardId?: string,
) {
  const sincePostFilter = since ? sql`AND fp.created_at >= ${since}` : sql``;
  const sinceVoteFilter = since ? sql`AND v.created_at  >= ${since}` : sql``;
  const sinceCommentFilter = since ? sql`AND c.created_at >= ${since}` : sql``;
  const boardPostFilter = boardId ? sql`AND fp.board_id = ${boardId}` : sql``;
  // Compute board post IDs once in a CTE and reuse for both votes and comments
  // rather than running two identical IN subqueries against feedback_posts.
  const boardPostIdsCte = boardId
    ? sql`, board_post_ids AS (SELECT id FROM feedback_posts WHERE board_id = ${boardId} AND organization_id = ${organizationId})`
    : sql``;
  const boardVoteFilter = boardId ? sql`AND v.post_id IN (SELECT id FROM board_post_ids)` : sql``;
  const boardCommentFilter = boardId ? sql`AND c.post_id IN (SELECT id FROM board_post_ids)` : sql``;

  const result = await db.execute(sql`
    WITH external_users AS (
      SELECT u.id, SPLIT_PART(u.email, '@', 2) AS domain
      FROM "user" u
      LEFT JOIN member m ON m.user_id = u.id AND m.organization_id = ${organizationId}
      WHERE m.user_id IS NULL
    )${boardPostIdsCte}
    SELECT
      eu.domain                                             AS "domain",
      COUNT(DISTINCT eu.id)::int                           AS "userCount",
      COUNT(DISTINCT fp.id)::int                           AS "postsSubmitted",
      COUNT(DISTINCT v.id)::int                            AS "votesCast",
      COUNT(DISTINCT c.id)::int                            AS "commentsLeft",
      GREATEST(
        MAX(v.created_at),
        MAX(c.created_at),
        MAX(fp.created_at)
      )::date::text                                        AS "lastActive"
    FROM external_users eu
    LEFT JOIN votes v
           ON  v.user_id         = eu.id
           AND v.organization_id = ${organizationId}
           ${sinceVoteFilter}
           ${boardVoteFilter}
    LEFT JOIN feedback_posts fp
           ON  fp.created_by          = eu.id
           AND fp.organization_id     = ${organizationId}
           AND fp.merged_into_post_id IS NULL
           ${sincePostFilter}
           ${boardPostFilter}
    LEFT JOIN comments c
           ON  c.user_id         = eu.id
           AND c.organization_id = ${organizationId}
           ${sinceCommentFilter}
           ${boardCommentFilter}
    WHERE (v.id IS NOT NULL OR fp.id IS NOT NULL OR c.id IS NOT NULL)
    GROUP BY eu.domain
    ORDER BY (COUNT(DISTINCT v.id) + COUNT(DISTINCT fp.id) + COUNT(DISTINCT c.id)) DESC
    LIMIT ${limit}
  `);

  return CompanyEngagementSchema.parse(result.rows);
}
