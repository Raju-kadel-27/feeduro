import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { changelogs, changelogTagItems, changelogTags } from "@/db/schema";

// ============ Tag Catalog (org-level) ============

export const CreateChangelogTagSchema = z.object({
  name: z.string().min(1).max(100).trim(),
});

export const AddChangelogTagSchema = z.object({
  tagId: z.string().min(1),
});

export async function listChangelogTags(db: Db, organizationId: string) {
  return db.query.changelogTags.findMany({
    where: eq(changelogTags.organizationId, organizationId),
    columns: { id: true, name: true, createdAt: true },
    orderBy: (t, { asc }) => [asc(t.name)],
  });
}

export async function createChangelogTag(
  db: Db,
  organizationId: string,
  input: z.infer<typeof CreateChangelogTagSchema>,
): Promise<{ data: { id: string; name: string; createdAt: Date } } | { error: "tag_name_exists" }> {
  try {
    const [tag] = await db
      .insert(changelogTags)
      .values({ organizationId, name: input.name })
      .returning({ id: changelogTags.id, name: changelogTags.name, createdAt: changelogTags.createdAt });
    return { data: tag };
  } catch {
    return { error: "tag_name_exists" };
  }
}

export async function deleteChangelogTag(
  db: Db,
  organizationId: string,
  tagId: string,
): Promise<boolean> {
  const tag = await db.query.changelogTags.findFirst({
    where: and(eq(changelogTags.id, tagId), eq(changelogTags.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!tag) return false;

  await db
    .delete(changelogTags)
    .where(and(eq(changelogTags.id, tagId), eq(changelogTags.organizationId, organizationId)));
  return true;
}

// ============ Per-Changelog Tag Associations ============

export async function listChangelogTagItems(
  db: Db,
  organizationId: string,
  changelogId: string,
): Promise<{ id: string; name: string }[] | null> {
  const entry = await db.query.changelogs.findFirst({
    where: and(eq(changelogs.id, changelogId), eq(changelogs.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!entry) return null;

  return db
    .select({ id: changelogTags.id, name: changelogTags.name })
    .from(changelogTagItems)
    .innerJoin(changelogTags, eq(changelogTagItems.tagId, changelogTags.id))
    .where(eq(changelogTagItems.changelogId, changelogId));
}

type AddChangelogTagItemResult =
  | { data: { changelogId: string; tagId: string } }
  | { error: "changelog_not_found" | "tag_not_found" };

export async function addChangelogTagItem(
  db: Db,
  organizationId: string,
  changelogId: string,
  tagId: string,
): Promise<AddChangelogTagItemResult> {
  const [entry, tag] = await Promise.all([
    db.query.changelogs.findFirst({
      where: and(eq(changelogs.id, changelogId), eq(changelogs.organizationId, organizationId)),
      columns: { id: true },
    }),
    db.query.changelogTags.findFirst({
      where: and(eq(changelogTags.id, tagId), eq(changelogTags.organizationId, organizationId)),
      columns: { id: true },
    }),
  ]);

  if (!entry) return { error: "changelog_not_found" };
  if (!tag) return { error: "tag_not_found" };

  await db
    .insert(changelogTagItems)
    .values({ changelogId, tagId })
    .onConflictDoNothing();

  return { data: { changelogId, tagId } };
}

export async function removeChangelogTagItem(
  db: Db,
  organizationId: string,
  changelogId: string,
  tagId: string,
): Promise<boolean> {
  const entry = await db.query.changelogs.findFirst({
    where: and(eq(changelogs.id, changelogId), eq(changelogs.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!entry) return false;

  const result = await db
    .delete(changelogTagItems)
    .where(and(eq(changelogTagItems.changelogId, changelogId), eq(changelogTagItems.tagId, tagId)))
    .returning({ changelogId: changelogTagItems.changelogId });

  return result.length > 0;
}
