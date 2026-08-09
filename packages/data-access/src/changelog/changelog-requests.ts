import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { changelogRequests, changelogs, feedbackPosts } from "@/db/schema";

export const AddChangelogRequestSchema = z.object({
  postId: z.string().min(1),
});

export async function listChangelogRequests(
  db: Db,
  organizationId: string,
  changelogId: string,
): Promise<{ id: string; title: string; status: string; addedAt: Date }[] | null> {
  const entry = await db.query.changelogs.findFirst({
    where: and(eq(changelogs.id, changelogId), eq(changelogs.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!entry) return null;

  const rows = await db.query.changelogRequests.findMany({
    where: eq(changelogRequests.changelogId, changelogId),
    columns: { postId: true, addedAt: true },
  });

  if (rows.length === 0) return [];

  const postIds = rows.map((r) => r.postId);
  const posts = await db.query.feedbackPosts.findMany({
    where: inArray(feedbackPosts.id, postIds),
    columns: { id: true, title: true, status: true },
  });

  const postMap = new Map(posts.map((p) => [p.id, p]));
  return rows
    .map((r) => {
      const p = postMap.get(r.postId);
      if (!p) return null;
      return { id: p.id, title: p.title, status: p.status, addedAt: r.addedAt };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}

type AddRequestResult =
  | { data: { changelogId: string; postId: string } }
  | { error: "changelog_not_found" | "post_not_found" };

export async function addChangelogRequest(
  db: Db,
  organizationId: string,
  changelogId: string,
  postId: string,
): Promise<AddRequestResult> {
  const [entry, post] = await Promise.all([
    db.query.changelogs.findFirst({
      where: and(eq(changelogs.id, changelogId), eq(changelogs.organizationId, organizationId)),
      columns: { id: true },
    }),
    db.query.feedbackPosts.findFirst({
      where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
      columns: { id: true },
    }),
  ]);

  if (!entry) return { error: "changelog_not_found" };
  if (!post) return { error: "post_not_found" };

  await db
    .insert(changelogRequests)
    .values({ changelogId, postId, organizationId })
    .onConflictDoNothing();

  return { data: { changelogId, postId } };
}

export async function removeChangelogRequest(
  db: Db,
  organizationId: string,
  changelogId: string,
  postId: string,
): Promise<boolean> {
  const entry = await db.query.changelogs.findFirst({
    where: and(eq(changelogs.id, changelogId), eq(changelogs.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!entry) return false;

  const result = await db
    .delete(changelogRequests)
    .where(
      and(
        eq(changelogRequests.changelogId, changelogId),
        eq(changelogRequests.postId, postId),
        eq(changelogRequests.organizationId, organizationId),
      ),
    )
    .returning({ changelogId: changelogRequests.changelogId });

  return result.length > 0;
}
