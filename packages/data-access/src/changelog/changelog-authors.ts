import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@feeduro/db";
import { changelogAuthors, changelogs, user } from "@feeduro/db/schema";

export const AddChangelogAuthorSchema = z.object({
  userId: z.string().min(1),
});

export async function listChangelogAuthors(
  db: Db,
  organizationId: string,
  changelogId: string,
): Promise<{ id: string; name: string; email: string; image: string | null; addedAt: Date }[] | null> {
  const entry = await db.query.changelogs.findFirst({
    where: and(eq(changelogs.id, changelogId), eq(changelogs.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!entry) return null;

  const rows = await db.query.changelogAuthors.findMany({
    where: eq(changelogAuthors.changelogId, changelogId),
    columns: { userId: true, addedAt: true },
  });

  if (rows.length === 0) return [];

  const userIds = rows.map((r) => r.userId);
  const users = await db.query.user.findMany({
    where: inArray(user.id, userIds),
    columns: { id: true, name: true, email: true, image: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));
  return rows
    .map((r) => {
      const u = userMap.get(r.userId);
      if (!u) return null;
      return { id: u.id, name: u.name, email: u.email, image: u.image, addedAt: r.addedAt };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}

type AddAuthorResult =
  | { data: { changelogId: string; userId: string } }
  | { error: "changelog_not_found" | "user_not_found" };

export async function addChangelogAuthor(
  db: Db,
  organizationId: string,
  changelogId: string,
  userId: string,
): Promise<AddAuthorResult> {
  const [entry, u] = await Promise.all([
    db.query.changelogs.findFirst({
      where: and(eq(changelogs.id, changelogId), eq(changelogs.organizationId, organizationId)),
      columns: { id: true },
    }),
    db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { id: true },
    }),
  ]);

  if (!entry) return { error: "changelog_not_found" };
  if (!u) return { error: "user_not_found" };

  await db
    .insert(changelogAuthors)
    .values({ changelogId, userId, organizationId })
    .onConflictDoNothing();

  return { data: { changelogId, userId } };
}

export async function removeChangelogAuthor(
  db: Db,
  organizationId: string,
  changelogId: string,
  userId: string,
): Promise<boolean> {
  const entry = await db.query.changelogs.findFirst({
    where: and(eq(changelogs.id, changelogId), eq(changelogs.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!entry) return false;

  const result = await db
    .delete(changelogAuthors)
    .where(
      and(
        eq(changelogAuthors.changelogId, changelogId),
        eq(changelogAuthors.userId, userId),
        eq(changelogAuthors.organizationId, organizationId),
      ),
    )
    .returning({ changelogId: changelogAuthors.changelogId });

  return result.length > 0;
}
