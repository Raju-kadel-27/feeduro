import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { changelogs } from "@/db/schema";

export const UpdateChangelogSchema = z.object({
  title: z.string().min(1).max(500).trim().optional(),
  body: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export async function updateChangelog(
  db: Db,
  organizationId: string,
  changelogId: string,
  input: z.infer<typeof UpdateChangelogSchema>,
) {
  const existing = await db.query.changelogs.findFirst({
    where: and(eq(changelogs.id, changelogId), eq(changelogs.organizationId, organizationId)),
    columns: { id: true, status: true, slug: true },
  });
  if (!existing) return null;

  const publishedAt =
    input.status === "published" && existing.status === "draft" ? new Date() : undefined;

  await db
    .update(changelogs)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.body !== undefined && { body: input.body }),
      ...(input.status !== undefined && { status: input.status }),
      ...(publishedAt !== undefined && { publishedAt }),
    })
    .where(and(eq(changelogs.id, changelogId), eq(changelogs.organizationId, organizationId)));

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

export async function deleteChangelog(
  db: Db,
  organizationId: string,
  changelogId: string,
): Promise<boolean> {
  const result = await db
    .delete(changelogs)
    .where(and(eq(changelogs.id, changelogId), eq(changelogs.organizationId, organizationId)))
    .returning({ id: changelogs.id });
  return result.length > 0;
}
