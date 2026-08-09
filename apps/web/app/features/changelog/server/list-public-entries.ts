import type { PublicChangelog } from "@features/feedback/schemas/public";
import { extractBlockNoteText } from "@features/feedback/utils";
import { and, count, desc, eq, ilike, inArray, lt } from "drizzle-orm";
import type { Db } from "@/db";
import { changelogLikes, changelogs } from "@/db/schema";

const PAGE_SIZE = 10;

export async function listPublicChangelogEntries(
  db: Db,
  orgId: string,
  userId: string | null,
  { limit = PAGE_SIZE, cursor, search }: { limit?: number; cursor?: string; search?: string } = {},
): Promise<{ entries: PublicChangelog[]; nextCursor: string | null; hasMore: boolean }> {
  const rows = await db.query.changelogs.findMany({
    where: and(
      eq(changelogs.organizationId, orgId),
      eq(changelogs.status, "published"),
      cursor ? lt(changelogs.publishedAt, new Date(cursor)) : undefined,
      search?.trim() ? ilike(changelogs.title, `%${search.trim()}%`) : undefined,
    ),
    orderBy: [desc(changelogs.publishedAt)],
    columns: { id: true, title: true, slug: true, body: true, publishedAt: true },
    limit: limit + 1,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (page[page.length - 1].publishedAt?.toISOString() ?? null) : null;

  if (page.length === 0) {
    return { entries: [], nextCursor: null, hasMore: false };
  }

  const ids = page.map((c) => c.id);

  const [likeCounts, userLikes] = await Promise.all([
    db
      .select({ changelogId: changelogLikes.changelogId, likeCount: count() })
      .from(changelogLikes)
      .where(inArray(changelogLikes.changelogId, ids))
      .groupBy(changelogLikes.changelogId),
    userId
      ? db
          .select({ changelogId: changelogLikes.changelogId })
          .from(changelogLikes)
          .where(and(inArray(changelogLikes.changelogId, ids), eq(changelogLikes.userId, userId)))
      : Promise.resolve([]),
  ]);

  const likeCountMap = Object.fromEntries(likeCounts.map((r) => [r.changelogId, r.likeCount]));
  const likedSet = new Set(userLikes.map((r) => r.changelogId));

  return {
    entries: page.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug ?? c.id,
      publishedAt: c.publishedAt?.toISOString() ?? c.id,
      body: c.body,
      authorName: "Team",
      voteCount: likeCountMap[c.id] ?? 0,
      voted: likedSet.has(c.id),
    })),
    nextCursor,
    hasMore,
  };
}
