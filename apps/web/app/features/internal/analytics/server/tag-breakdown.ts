import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { TagBreakdownSchema } from "../schemas/analytics";

export async function getTagBreakdown(
  db: Db,
  organizationId: string,
  since?: Date,
  limit = 12,
  boardId?: string,
) {
  const boardFilter = boardId ? sql`AND fp.board_id = ${boardId}` : sql``;
  // Filter votes by the selected period so totalVotes reflects period activity.
  // postCount covers all posts carrying this tag, not just recently created ones.
  const sinceJoinFilter = since ? sql`AND v.created_at >= ${since}` : sql``;

  const result = await db.execute(sql`
    SELECT
      ft.name                              AS "tagName",
      ft.color                             AS "tagColor",
      COUNT(DISTINCT fp.id)::int           AS "postCount",
      COUNT(DISTINCT v.id)::int            AS "totalVotes"
    FROM feedback_tags ft
    INNER JOIN post_tags pt ON pt.tag_id = ft.id
    INNER JOIN feedback_posts fp
           ON  fp.id = pt.post_id
           AND fp.merged_into_post_id IS NULL
           ${boardFilter}
    LEFT JOIN votes v ON v.post_id = fp.id ${sinceJoinFilter}
    WHERE ft.organization_id = ${organizationId}
    GROUP BY ft.id, ft.name, ft.color
    ORDER BY COUNT(DISTINCT v.id) DESC, COUNT(DISTINCT fp.id) DESC
    LIMIT ${limit}
  `);

  return TagBreakdownSchema.parse(result.rows);
}
