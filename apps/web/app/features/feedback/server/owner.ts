import { notifyOwnerAssigned } from "@features/notifications/server/service";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackPosts, member, postActivities, user } from "@/db/schema";

export async function assignPostOwner({
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
}): Promise<{ error?: string }> {
  const db = getDb();

  const post = await db.query.feedbackPosts.findFirst({
    where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
    columns: { ownerId: true, title: true },
  });
  if (!post) return { error: "Post not found" };

  if (newOwnerId !== null) {
    const ownerMember = await db.query.member.findFirst({
      where: and(
        eq(member.organizationId, organizationId),
        eq(member.userId, newOwnerId),
        inArray(member.role, ["admin", "owner"]),
      ),
    });
    if (!ownerMember) return { error: "Owner must be an admin of this organization" };
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
