import { createId } from "@paralleldrive/cuid2";
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { feedbackBoards, feedbackPosts } from "@/db/schema";

export async function listBoards(db: Db, organizationId: string) {
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

export async function getBoard(db: Db, organizationId: string, boardId: string) {
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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

export async function createBoard(
  db: Db,
  organizationId: string,
  input: { name: string; description?: string | null; visibility?: "public" | "private" },
) {
  const baseSlug = slugify(input.name) || createId().substring(0, 16);
  const existing = await db.query.feedbackBoards.findFirst({
    where: and(eq(feedbackBoards.organizationId, organizationId), eq(feedbackBoards.slug, baseSlug)),
    columns: { id: true },
  });
  const slug = existing ? `${baseSlug}-${createId().substring(0, 6)}` : baseSlug;

  const [board] = await db
    .insert(feedbackBoards)
    .values({
      organizationId,
      name: input.name.trim(),
      slug,
      description: input.description?.trim() ?? null,
      visibility: input.visibility ?? "public",
      isDefault: false,
    })
    .returning({
      id: feedbackBoards.id,
      name: feedbackBoards.name,
      slug: feedbackBoards.slug,
      description: feedbackBoards.description,
      visibility: feedbackBoards.visibility,
      isDefault: feedbackBoards.isDefault,
      createdAt: feedbackBoards.createdAt,
      updatedAt: feedbackBoards.updatedAt,
    });

  return { ...board, postCount: 0 };
}

export async function updateBoard(
  db: Db,
  organizationId: string,
  boardId: string,
  input: { name?: string; description?: string | null; visibility?: "public" | "private" },
) {
  const patch: Partial<typeof feedbackBoards.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if ("description" in input) patch.description = input.description?.trim() ?? null;
  if (input.visibility !== undefined) patch.visibility = input.visibility;

  const [board] = await db
    .update(feedbackBoards)
    .set(patch)
    .where(and(eq(feedbackBoards.organizationId, organizationId), eq(feedbackBoards.id, boardId)))
    .returning({
      id: feedbackBoards.id,
      name: feedbackBoards.name,
      slug: feedbackBoards.slug,
      description: feedbackBoards.description,
      visibility: feedbackBoards.visibility,
      isDefault: feedbackBoards.isDefault,
      createdAt: feedbackBoards.createdAt,
      updatedAt: feedbackBoards.updatedAt,
    });

  if (!board) return null;
  return { ...board, postCount: 0 };
}

export async function deleteBoard(
  db: Db,
  organizationId: string,
  boardId: string,
): Promise<{ success: true } | { success: false; reason: "not_found" | "default_board" }> {
  const board = await db.query.feedbackBoards.findFirst({
    where: and(eq(feedbackBoards.organizationId, organizationId), eq(feedbackBoards.id, boardId)),
    columns: { id: true, isDefault: true },
  });

  if (!board) return { success: false, reason: "not_found" };
  if (board.isDefault) return { success: false, reason: "default_board" };

  const defaultBoard = await db.query.feedbackBoards.findFirst({
    where: and(
      eq(feedbackBoards.organizationId, organizationId),
      eq(feedbackBoards.isDefault, true),
    ),
    columns: { id: true },
  });

  if (defaultBoard) {
    await db
      .update(feedbackPosts)
      .set({ boardId: defaultBoard.id })
      .where(
        and(
          eq(feedbackPosts.organizationId, organizationId),
          eq(feedbackPosts.boardId, boardId),
        ),
      );
  }

  await db
    .delete(feedbackBoards)
    .where(and(eq(feedbackBoards.organizationId, organizationId), eq(feedbackBoards.id, boardId)));

  return { success: true };
}
