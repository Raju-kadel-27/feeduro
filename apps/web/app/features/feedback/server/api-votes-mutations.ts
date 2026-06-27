import { notifyVoteMilestoneIfReached } from "@features/internal/notifications/server/service";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { feedbackPosts, user, votes } from "@/db/schema";

export const CreateVoteSchema = z.object({
  postId: z.string().min(1),
  userId: z.string().min(1),
});

type CreateVoteResult =
  | { data: { id: string; postId: string; userId: string; createdAt: Date; voteCount: number } }
  | { error: "post_not_found" | "user_not_found" | "already_voted" };

export async function createVote(
  organizationId: string,
  input: z.infer<typeof CreateVoteSchema>,
): Promise<CreateVoteResult> {
  const db = getDb();

  const [post, voter, existing] = await Promise.all([
    db.query.feedbackPosts.findFirst({
      where: and(
        eq(feedbackPosts.organizationId, organizationId),
        eq(feedbackPosts.id, input.postId),
      ),
      columns: { id: true },
    }),
    db.select({ id: user.id }).from(user).where(eq(user.id, input.userId)).limit(1),
    db.query.votes.findFirst({
      where: and(eq(votes.postId, input.postId), eq(votes.userId, input.userId)),
      columns: { id: true },
    }),
  ]);

  if (!post) return { error: "post_not_found" };
  if (!voter[0]) return { error: "user_not_found" };
  if (existing) return { error: "already_voted" };

  const id = createId();
  const createdAt = new Date();

  const { voteCount } = await db.transaction(async (tx) => {
    await tx.insert(votes).values({ id, postId: input.postId, userId: input.userId, organizationId });
    const [updated] = await tx
      .update(feedbackPosts)
      .set({ voteCount: sql`vote_count + 1` })
      .where(eq(feedbackPosts.id, input.postId))
      .returning({ voteCount: feedbackPosts.voteCount });
    return { voteCount: updated?.voteCount ?? 1 };
  });

  notifyVoteMilestoneIfReached({
    postId: input.postId,
    organizationId,
    newVoteCount: voteCount,
  }).catch(() => {});

  return { data: { id, postId: input.postId, userId: input.userId, createdAt, voteCount } };
}

export async function deleteVote(organizationId: string, voteId: string): Promise<boolean> {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(votes)
      .where(and(eq(votes.id, voteId), eq(votes.organizationId, organizationId)))
      .returning({ postId: votes.postId });
    if (!deleted) return false;
    await tx
      .update(feedbackPosts)
      .set({ voteCount: sql`greatest(vote_count - 1, 0)` })
      .where(eq(feedbackPosts.id, deleted.postId));
    return true;
  });
}
