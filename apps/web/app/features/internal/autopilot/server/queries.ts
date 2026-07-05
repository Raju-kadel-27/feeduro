import { and, count, desc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { autopilotSuggestions, feedbackBoards, feedbackPosts } from "@/db/schema";
import type { SuggestionStatus, SuggestionWithPosts } from "../types";

export async function getPendingSuggestionsCount(db: Db, organizationId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(autopilotSuggestions)
    .where(
      and(
        eq(autopilotSuggestions.organizationId, organizationId),
        eq(autopilotSuggestions.status, "pending"),
      ),
    );
  return result[0]?.count ?? 0;
}

export async function getPendingSuggestions(
  db: Db,
  organizationId: string,
): Promise<SuggestionWithPosts[]> {
  return getSuggestionsByStatus(db, organizationId, "pending");
}

export async function getSuggestionsByStatus(
  db: Db,
  organizationId: string,
  status: SuggestionStatus,
): Promise<SuggestionWithPosts[]> {
  const rows = await db.query.autopilotSuggestions.findMany({
    where: and(
      eq(autopilotSuggestions.organizationId, organizationId),
      eq(autopilotSuggestions.status, status),
    ),
    columns: {
      id: true,
      organizationId: true,
      type: true,
      status: true,
      sourcePostId: true,
      targetPostId: true,
      confidence: true,
      reason: true,
      resolvedAt: true,
      resolvedByUserId: true,
      createdAt: true,
    },
    orderBy: [desc(autopilotSuggestions.createdAt)],
  });

  if (rows.length === 0) return [];

  const sourcePostIds = rows.map((r) => r.sourcePostId);
  const targetPostIds = rows.map((r) => r.targetPostId).filter(Boolean) as string[];
  const allPostIds = [...new Set([...sourcePostIds, ...targetPostIds])];

  const [postRows, boardRows] = await Promise.all([
    db.query.feedbackPosts.findMany({
      where: and(eq(feedbackPosts.organizationId, organizationId)),
      columns: { id: true, title: true, description: true, boardId: true },
    }),
    db.query.feedbackBoards.findMany({
      where: eq(feedbackBoards.organizationId, organizationId),
      columns: { id: true, name: true },
    }),
  ]);

  const postMap = new Map(postRows.map((p) => [p.id, p]));
  const boardMap = new Map(boardRows.map((b) => [b.id, b.name]));

  return rows
    .map((row) => {
      const sourcePost = postMap.get(row.sourcePostId);
      if (!sourcePost) return null;

      const targetPost = row.targetPostId ? (postMap.get(row.targetPostId) ?? null) : null;

      return {
        ...row,
        createdAt: row.createdAt.toISOString(),
        resolvedAt: row.resolvedAt?.toISOString() ?? null,
        sourcePost: {
          id: sourcePost.id,
          title: sourcePost.title,
          description: sourcePost.description,
          boardName: boardMap.get(sourcePost.boardId) ?? "Unknown",
        },
        targetPost: targetPost ? { id: targetPost.id, title: targetPost.title } : null,
      };
    })
    .filter(Boolean) as SuggestionWithPosts[];
}
