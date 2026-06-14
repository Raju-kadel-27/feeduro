import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackBoards, feedbackPosts, member, reactions, user, votes } from "@/db/schema";

export async function getPostCoreData(organizationId: string, postId: string, userId: string) {
  const db = getDb();

  const post = await db.query.feedbackPosts.findFirst({
    where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
  });
  if (!post) return null;

  const [
    board,
    voteCountRow,
    currentVote,
    reactionCountRows,
    myReactionRows,
    authorRow,
    memberRecord,
    ownerRow,
    orgAdminRows,
  ] = await Promise.all([
    db.query.feedbackBoards.findFirst({
      where: eq(feedbackBoards.id, post.boardId),
      columns: { slug: true, name: true, visibility: true },
    }),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(votes)
      .where(eq(votes.postId, postId)),
    db.query.votes.findFirst({
      where: and(eq(votes.postId, postId), eq(votes.userId, userId)),
    }),
    db
      .select({ type: reactions.type, count: sql<number>`count(*)`.mapWith(Number) })
      .from(reactions)
      .where(eq(reactions.postId, postId))
      .groupBy(reactions.type),
    db
      .select({ type: reactions.type })
      .from(reactions)
      .where(and(eq(reactions.postId, postId), eq(reactions.userId, userId))),
    post.createdBy
      ? db.query.user.findFirst({
          where: eq(user.id, post.createdBy),
          columns: { name: true, email: true, image: true },
        })
      : Promise.resolve(null),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
      columns: { role: true },
    }),
    post.ownerId
      ? db.query.user.findFirst({
          where: eq(user.id, post.ownerId),
          columns: { id: true, name: true, image: true },
        })
      : Promise.resolve(null),
    db
      .select({ id: member.userId, name: user.name, image: user.image })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, organizationId)),
  ]);

  return {
    post,
    board,
    voteCountRow,
    currentVote,
    reactionCountRows,
    myReactionRows,
    authorRow,
    memberRecord,
    ownerRow,
    orgAdminRows,
  };
}
