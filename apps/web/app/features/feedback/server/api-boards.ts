import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackBoards, feedbackPosts } from "@/db/schema";

export async function listBoards(organizationId: string) {
  const db = getDb();

  const [boards, counts] = await Promise.all([
    db.query.feedbackBoards.findMany({
      where: eq(feedbackBoards.organizationId, organizationId),
      columns: {
        id: true,
        name: true,
        slug: true,
        description: true,
        visibility: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: (t, { desc }) => [desc(t.isDefault), desc(t.createdAt)],
    }),
    db
      .select({
        boardId: feedbackPosts.boardId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(feedbackPosts)
      .where(eq(feedbackPosts.organizationId, organizationId))
      .groupBy(feedbackPosts.boardId),
  ]);

  const countMap = Object.fromEntries(counts.map((r) => [r.boardId, r.count]));
  return boards.map((b) => ({ ...b, postCount: countMap[b.id] ?? 0 }));
}

export async function getBoard(organizationId: string, boardId: string) {
  const db = getDb();

  const [board, countRow] = await Promise.all([
    db.query.feedbackBoards.findFirst({
      where: and(
        eq(feedbackBoards.organizationId, organizationId),
        eq(feedbackBoards.id, boardId),
      ),
      columns: {
        id: true,
        name: true,
        slug: true,
        description: true,
        visibility: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(feedbackPosts)
      .where(
        and(
          eq(feedbackPosts.organizationId, organizationId),
          eq(feedbackPosts.boardId, boardId),
        ),
      ),
  ]);

  if (!board) return null;
  return { ...board, postCount: countRow[0]?.count ?? 0 };
}
