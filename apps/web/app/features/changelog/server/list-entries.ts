import { extractBlockNoteText } from "@features/feedback/utils";
import { and, desc, eq, ilike, lt } from "drizzle-orm";
import type { Db } from "@/db";
import { changelogs } from "@/db/schema";

const PAGE_SIZE = 20;

export async function listChangelogEntries(
  db: Db,
  organizationId: string,
  { limit = PAGE_SIZE, cursor, search }: { limit?: number; cursor?: string; search?: string } = {},
) {
  const rows = await db.query.changelogs.findMany({
    where: and(
      eq(changelogs.organizationId, organizationId),
      cursor ? lt(changelogs.createdAt, new Date(cursor)) : undefined,
      search?.trim() ? ilike(changelogs.title, `%${search.trim()}%`) : undefined,
    ),
    orderBy: [desc(changelogs.createdAt)],
    columns: {
      id: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      body: true,
    },
    limit: limit + 1,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1].createdAt.toISOString() : null;

  return {
    entries: page.map(({ body, ...rest }) => ({
      ...rest,
      excerpt: body ? extractBlockNoteText(body, 160) : "",
    })),
    nextCursor,
    hasMore,
  };
}
