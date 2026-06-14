import { decodeCursor, encodeCursor } from "@lib/api/cursor";
import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { changelogs } from "@/db/schema";

export const ListChangelogSchema = z.object({
  status: z.enum(["draft", "published"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export const CreateChangelogSchema = z.object({
  title: z.string().min(1).max(500).trim(),
  body: z.string().default("[]"),
  status: z.enum(["draft", "published"]).default("draft"),
});

const LIST_COLS = {
  id: true,
  title: true,
  slug: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

export async function listChangelogs(
  organizationId: string,
  params: z.infer<typeof ListChangelogSchema>,
) {
  const db = getDb();
  const { status, limit, cursor } = params;
  const cursorDate = cursor ? decodeCursor(cursor) : null;

  const entries = await db.query.changelogs.findMany({
    where: and(
      eq(changelogs.organizationId, organizationId),
      status ? eq(changelogs.status, status) : undefined,
      cursorDate ? lt(changelogs.createdAt, cursorDate) : undefined,
    ),
    columns: LIST_COLS,
    orderBy: [desc(changelogs.createdAt)],
    limit: limit + 1,
  });

  const hasMore = entries.length > limit;
  const items = hasMore ? entries.slice(0, limit) : entries;
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1].createdAt) : undefined;

  return { data: items, hasMore, cursor: nextCursor };
}

export async function getChangelog(organizationId: string, changelogId: string) {
  const db = getDb();
  return db.query.changelogs.findFirst({
    where: and(eq(changelogs.id, changelogId), eq(changelogs.organizationId, organizationId)),
    columns: {
      id: true,
      title: true,
      slug: true,
      body: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createChangelog(
  organizationId: string,
  input: z.infer<typeof CreateChangelogSchema>,
) {
  const db = getDb();

  const baseSlug = slugify(input.title) || createId().substring(0, 16);
  const existing = await db.query.changelogs.findFirst({
    where: and(eq(changelogs.organizationId, organizationId), eq(changelogs.slug, baseSlug)),
    columns: { id: true },
  });
  const slug = existing ? `${baseSlug}-${createId().substring(0, 8)}` : baseSlug;
  const publishedAt = input.status === "published" ? new Date() : null;

  const [entry] = await db
    .insert(changelogs)
    .values({ organizationId, title: input.title, slug, body: input.body, status: input.status, publishedAt })
    .returning({
      id: changelogs.id,
      title: changelogs.title,
      slug: changelogs.slug,
      status: changelogs.status,
      publishedAt: changelogs.publishedAt,
      createdAt: changelogs.createdAt,
      updatedAt: changelogs.updatedAt,
    });

  return entry;
}
