import { sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";

export const SearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  voteCount: z.number(),
  boardId: z.string(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

function buildPrefixTsQuery(q: string): string {
  const words = q.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const sanitized = words
    .map((w) => w.replace(/[&|!'():*<>\\]/g, "").trim())
    .filter((w) => w.length > 0);
  if (!sanitized.length) return "";
  // Only the last word (currently being typed) gets :* for prefix matching.
  // Completed words use exact lexeme matching for better precision and ranking.
  return sanitized.map((w, i) => (i === sanitized.length - 1 ? `${w}:*` : w)).join(" & ");
}

export async function searchFeedbackPosts(
  db: Db,
  organizationId: string,
  query: string,
  limit = 15,
): Promise<SearchResult[]> {
  const tsQuery = buildPrefixTsQuery(query);
  if (!tsQuery) return [];

  try {
    // CROSS JOIN LATERAL materialises to_tsquery once per query execution so
    // the same tsquery object is reused in both the @@ filter and ts_rank —
    // no duplicate parsing on every row.
    const result = await db.execute<{
      id: string;
      title: string;
      status: string;
      voteCount: number;
      boardId: string;
    }>(sql`
      SELECT
        fp.id,
        fp.title,
        fp.status,
        fp.vote_count AS "voteCount",
        fp.board_id   AS "boardId"
      FROM  feedback_posts fp
      CROSS JOIN LATERAL (SELECT to_tsquery('english', ${tsQuery}) AS tsq) AS q
      WHERE fp.organization_id    = ${organizationId}
        AND fp.merged_into_post_id IS NULL
        AND fp.search_vector @@ q.tsq
      ORDER BY ts_rank(fp.search_vector, q.tsq, 32) DESC
      LIMIT ${limit}
    `);

    return result.rows.flatMap((row) => {
      const parsed = SearchResultSchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    });
  } catch (err) {
    console.error("[search] full-text search query failed:", err);
    return [];
  }
}
