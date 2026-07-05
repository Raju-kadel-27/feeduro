import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { feedbackPosts, feedbackViews } from "@/db/schema";
import { type Post, postMatchesFilters, type Sort, type View, type ViewFilters } from "../types";


function parseFilters(raw: string): ViewFilters {
  try {
    return JSON.parse(raw) as ViewFilters;
  } catch {
    return {};
  }
}

function rowToView(row: typeof feedbackViews.$inferSelect): Omit<View, "count"> {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    isSystem: row.isSystem,
    sort: row.sort as Sort,
    order: row.order,
    filters: parseFilters(row.filters),
  };
}

export async function getOrgViews(db: Db, organizationId: string): Promise<Omit<View, "count">[]> {
  const rows = await db.query.feedbackViews.findMany({
    where: eq(feedbackViews.organizationId, organizationId),
    orderBy: [asc(feedbackViews.order), asc(feedbackViews.createdAt)],
  });

  return rows.map(rowToView);
}

export async function getOrgViewsWithCounts(db: Db, organizationId: string): Promise<View[]> {
  const [views, posts] = await Promise.all([
    getOrgViews(db, organizationId),
    db
      .select({
        id: feedbackPosts.id,
        status: feedbackPosts.status,
        boardId: feedbackPosts.boardId,
        createdBy: feedbackPosts.createdBy,
        createdAt: feedbackPosts.createdAt,
      })
      .from(feedbackPosts)
      .where(and(eq(feedbackPosts.organizationId, organizationId))),
  ]);

  const postsForFilter: Post[] = posts.map((p) => ({
    id: p.id,
    title: "",
    description: null,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    boardId: p.boardId,
    createdBy: p.createdBy,
    voteCount: 0,
    hasVoted: false,
    commentCount: 0,
  }));

  return views.map((v) => ({
    ...v,
    count: postsForFilter.filter((p) => postMatchesFilters(p, v.filters)).length,
  }));
}


export async function createView(
  db: Db,
  organizationId: string,
  data: { name: string; emoji: string; filters: ViewFilters; sort: Sort },
): Promise<Omit<View, "count">> {
  const existing = await db.query.feedbackViews.findMany({
    where: eq(feedbackViews.organizationId, organizationId),
    columns: { order: true },
  });
  const maxOrder = existing.reduce((m, r) => Math.max(m, r.order), -1);
  const [row] = await db
    .insert(feedbackViews)
    .values({
      organizationId,
      name: data.name.trim(),
      emoji: data.emoji,
      isSystem: false,
      sort: data.sort,
      order: maxOrder + 1,
      filters: JSON.stringify(data.filters),
    })
    .returning();
  return rowToView(row);
}

export async function updateView(
  db: Db,
  organizationId: string,
  viewId: string,
  data: Partial<{ name: string; emoji: string; filters: ViewFilters; sort: Sort }>,
): Promise<void> {
  await db
    .update(feedbackViews)
    .set({
      ...(data.name && { name: data.name.trim() }),
      ...(data.emoji && { emoji: data.emoji }),
      ...(data.filters && { filters: JSON.stringify(data.filters) }),
      ...(data.sort && { sort: data.sort }),
    })
    .where(and(eq(feedbackViews.id, viewId), eq(feedbackViews.organizationId, organizationId)));
}

export async function deleteView(db: Db, organizationId: string, viewId: string): Promise<void> {
  const view = await db.query.feedbackViews.findFirst({
    where: and(eq(feedbackViews.id, viewId), eq(feedbackViews.organizationId, organizationId)),
    columns: { isSystem: true },
  });
  if (!view || view.isSystem) throw new Error("Cannot delete system views");
  await db
    .delete(feedbackViews)
    .where(and(eq(feedbackViews.id, viewId), eq(feedbackViews.organizationId, organizationId)));
}
