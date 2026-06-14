import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { TagBreakdownSchema } from "../schemas/analytics";

export async function getTagBreakdown(
  organizationId: string,
  since?: Date,
  limit = 12,
  boardId?: string,
) {
  const db = getDb();

  const sinceFilter = since ? sql`AND fp.created_at >= ${since}` : sql``;
  const boardFilter = boardId ? sql`AND fp.board_id = ${boardId}` : sql``;

  const result = await db.execute(sql`
    SELECT
      ft.name                              AS "tagName",
      ft.color                             AS "tagColor",
      COUNT(DISTINCT fp.id)::int           AS "postCount",
      COALESCE(SUM(fp.vote_count), 0)::int AS "totalVotes"
    FROM feedback_tags ft
    INNER JOIN post_tags pt ON pt.tag_id = ft.id
    INNER JOIN feedback_posts fp
           ON  fp.id = pt.post_id
           AND fp.merged_into_post_id IS NULL
           ${sinceFilter}
           ${boardFilter}
    WHERE ft.organization_id = ${organizationId}
    GROUP BY ft.id, ft.name, ft.color
    ORDER BY "postCount" DESC, "totalVotes" DESC
    LIMIT ${limit}
  `);

  return TagBreakdownSchema.parse(result.rows);
}
