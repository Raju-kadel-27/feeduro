import { notifyOwnerAssigned } from "@features/internal/notifications/server/service";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { feedbackPosts, member, postActivities, user } from "@/db/schema";

export async function assignPostOwner(
  db: Db,
  {
    postId,
    organizationId,
    actorId,
    actorName,
    newOwnerId,
  }: {
    postId: string;
    organizationId: string;
    actorId: string;
    actorName: string;
    newOwnerId: string | null;
  },
): Promise<{ error?: string }> {
  const post = await db.query.feedbackPosts.findFirst({
    where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
    columns: { ownerId: true, title: true },
  });
  if (!post) return { error: "Post not found" };

  if (newOwnerId !== null) {
    const ownerMember = await db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, newOwnerId)),
      columns: { userId: true },
    });
    if (!ownerMember) return { error: "Owner must be a member of this organization" };
  }

  const ownerRow = newOwnerId
    ? await db.query.user.findFirst({
        where: eq(user.id, newOwnerId),
        columns: { name: true },
      })
    : null;

  const oldOwnerRow = post.ownerId
    ? await db.query.user.findFirst({
        where: eq(user.id, post.ownerId),
        columns: { name: true },
      })
    : null;

  await db
    .update(feedbackPosts)
    .set({ ownerId: newOwnerId })
    .where(and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)));

  await db.insert(postActivities).values({
    postId,
    organizationId,
    userId: actorId,
    type: "owner_assigned",
    oldValue: oldOwnerRow?.name ?? null,
    newValue: ownerRow?.name ?? "Unassigned",
  });

  if (newOwnerId && newOwnerId !== actorId) {
    notifyOwnerAssigned({
      postId,
      postTitle: post.title,
      newOwnerId,
      actorId,
      organizationId,
      actorName,
    }).catch((err) => console.error("[owner-assigned]", err));
  }

  return {};
}
