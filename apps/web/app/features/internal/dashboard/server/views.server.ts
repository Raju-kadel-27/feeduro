import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackPosts, feedbackViews } from "@/db/schema";
import { type Post, postMatchesFilters, type Sort, type View, type ViewFilters } from "../types";

const DEFAULT_VIEWS: Omit<View, "id" | "count">[] = [
  {
    name: "Triage queue",
    emoji: "🔥",
    isSystem: true,
    sort: "newest",
    order: 0,
    filters: { status: ["open"] },
  },
  {
    name: "Needs review",
    emoji: "👀",
    isSystem: true,
    sort: "oldest",
    order: 1,
    filters: { status: ["reviewing"] },
  },
  {
    name: "Ready to ship",
    emoji: "🚀",
    isSystem: true,
    sort: "votes",
    order: 2,
    filters: { status: ["planned"] },
  },
  {
    name: "Customer waiting",
    emoji: "⏱️",
    isSystem: true,
    sort: "oldest",
    order: 3,
    filters: { hasCustomerComment: true, excludeStatus: ["completed", "closed"], minAge: 7 },
  },
  {
    name: "Recently completed",
    emoji: "✅",
    isSystem: true,
    sort: "newest",
    order: 4,
    filters: { status: ["completed"], maxAge: 7 },
  },
  {
    name: "Customer commented",
    emoji: "💬",
    isSystem: true,
    sort: "newest",
    order: 5,
    filters: { hasCustomerComment: true },
  },
  {
    name: "Has comments",
    emoji: "🗨️",
    isSystem: true,
    sort: "newest",
    order: 6,
    filters: { hasComments: true },
  },
];

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

export async function getOrgViews(organizationId: string): Promise<Omit<View, "count">[]> {
  const db = getDb();
  const rows = await db.query.feedbackViews.findMany({
    where: eq(feedbackViews.organizationId, organizationId),
    orderBy: [asc(feedbackViews.order), asc(feedbackViews.createdAt)],
  });

  if (rows.length === 0) {
    return seedDefaultViews(organizationId);
  }

  return rows.map(rowToView);
}

export async function getOrgViewsWithCounts(organizationId: string): Promise<View[]> {
  const db = getDb();
  const [views, posts] = await Promise.all([
    getOrgViews(organizationId),
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

async function seedDefaultViews(organizationId: string): Promise<Omit<View, "count">[]> {
  const db = getDb();
  const rows = await db
    .insert(feedbackViews)
    .values(
      DEFAULT_VIEWS.map((v) => ({
        organizationId,
        name: v.name,
        emoji: v.emoji,
        isSystem: v.isSystem,
        sort: v.sort,
        order: v.order,
        filters: JSON.stringify(v.filters),
      })),
    )
    .returning();
  return rows.map(rowToView);
}

export async function createView(
  organizationId: string,
  data: { name: string; emoji: string; filters: ViewFilters; sort: Sort },
): Promise<Omit<View, "count">> {
  const db = getDb();
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
  organizationId: string,
  viewId: string,
  data: Partial<{ name: string; emoji: string; filters: ViewFilters; sort: Sort }>,
): Promise<void> {
  const db = getDb();
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

export async function deleteView(organizationId: string, viewId: string): Promise<void> {
  const db = getDb();
  const view = await db.query.feedbackViews.findFirst({
    where: and(eq(feedbackViews.id, viewId), eq(feedbackViews.organizationId, organizationId)),
    columns: { isSystem: true },
  });
  if (!view || view.isSystem) throw new Error("Cannot delete system views");
  await db
    .delete(feedbackViews)
    .where(and(eq(feedbackViews.id, viewId), eq(feedbackViews.organizationId, organizationId)));
}
