import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { comments, feedbackPosts, member, user } from "@/db/schema";
import { isVoteMilestone } from "../schemas/notification";
import { insertNotifications } from "./mutations";

// ─── new_comment ─────────────────────────────────────────────────────────────
// Notifies the post author + everyone who previously commented,
// excluding the commenter themselves.

export async function notifyNewComment(
  db: Db,
  {
    postId,
    commentBody,
    actorId,
    organizationId,
    postTitle,
    actorName,
  }: {
    postId: string;
    commentBody: string;
    actorId: string;
    organizationId: string;
    postTitle: string;
    actorName: string;
  },
): Promise<void> {
  const [post, prevCommenters] = await Promise.all([
    db.query.feedbackPosts.findFirst({
      where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
      columns: { createdBy: true },
    }),
    db.query.comments.findMany({
      where: and(eq(comments.postId, postId), eq(comments.organizationId, organizationId)),
      columns: { userId: true },
    }),
  ]);

  if (!post) return;

  const recipientSet = new Set<string>();
  if (post.createdBy && post.createdBy !== actorId) recipientSet.add(post.createdBy);
  for (const c of prevCommenters) {
    if (c.userId !== actorId) recipientSet.add(c.userId);
  }

  const metadata = {
    postTitle,
    commentBody: commentBody.slice(0, 200),
    actorName,
  };

  await insertNotifications(
    db,
    [...recipientSet].map((userId) => ({
      organizationId,
      userId,
      type: "new_comment" as const,
      postId,
      actorId,
      metadata,
    })),
  );
}

// ─── mention ─────────────────────────────────────────────────────────────────
// Parses @Name mentions from comment body and notifies matched org members.

export async function notifyMentions(
  db: Db,
  {
    postId,
    commentBody,
    actorId,
    organizationId,
    postTitle,
    actorName,
  }: {
    postId: string;
    commentBody: string;
    actorId: string;
    organizationId: string;
    postTitle: string;
    actorName: string;
  },
): Promise<void> {
  const mentionWords = extractMentions(commentBody);
  if (mentionWords.length === 0) return;

  const orgMembers = await db
    .select({ userId: member.userId, name: user.name, email: user.email })
    .from(member)
    .leftJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, organizationId));

  const mentioned = orgMembers.filter(
    (m) =>
      m.userId !== actorId &&
      mentionWords.some(
        (w) =>
          m.name?.toLowerCase().includes(w.toLowerCase()) ||
          m.email?.toLowerCase().startsWith(w.toLowerCase()),
      ),
  );

  if (mentioned.length === 0) return;

  await insertNotifications(
    db,
    mentioned.map((m) => ({
      organizationId,
      userId: m.userId,
      type: "mention" as const,
      postId,
      actorId,
      metadata: { postTitle, commentBody: commentBody.slice(0, 200), actorName },
    })),
  );
}

function extractMentions(text: string): string[] {
  const matches = text.match(/@(\w+)/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

// ─── new_post ─────────────────────────────────────────────────────────────────
// Notifies all admin/member members of the org (excluding the creator).

export async function notifyNewPost(
  db: Db,
  {
    postId,
    postTitle,
    actorId,
    organizationId,
    actorName,
  }: {
    postId: string;
    postTitle: string;
    actorId: string;
    organizationId: string;
    actorName: string;
  },
): Promise<void> {
  const orgMembers = await db.query.member.findMany({
    where: eq(member.organizationId, organizationId),
    columns: { userId: true, role: true },
  });

  const recipients = orgMembers
    .filter((m) => m.userId !== actorId && m.role !== "viewer")
    .map((m) => m.userId);

  await insertNotifications(
    db,
    recipients.map((userId) => ({
      organizationId,
      userId,
      type: "new_post" as const,
      postId,
      actorId,
      metadata: { postTitle, actorName },
    })),
  );
}

// ─── status_changed ───────────────────────────────────────────────────────────
// Notifies the post author when status changes (unless they made the change).

export async function notifyStatusChanged(
  db: Db,
  {
    postId,
    postTitle,
    oldStatus,
    newStatus,
    actorId,
    organizationId,
    actorName,
  }: {
    postId: string;
    postTitle: string;
    oldStatus: string;
    newStatus: string;
    actorId: string;
    organizationId: string;
    actorName: string;
  },
): Promise<void> {
  const post = await db.query.feedbackPosts.findFirst({
    where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
    columns: { createdBy: true },
  });

  if (!post?.createdBy || post.createdBy === actorId) return;

  await insertNotifications(db, [
    {
      organizationId,
      userId: post.createdBy,
      type: "status_changed" as const,
      postId,
      actorId,
      metadata: { postTitle, oldStatus, newStatus, actorName },
    },
  ]);
}

// ─── post_merged ─────────────────────────────────────────────────────────────
// Notifies the source post author when their post is merged.

export async function notifyPostMerged(
  db: Db,
  {
    sourcePostId,
    actorId,
    organizationId,
    actorName,
  }: {
    sourcePostId: string;
    actorId: string;
    organizationId: string;
    actorName: string;
  },
): Promise<void> {
  const post = await db.query.feedbackPosts.findFirst({
    where: and(
      eq(feedbackPosts.id, sourcePostId),
      eq(feedbackPosts.organizationId, organizationId),
    ),
    columns: { createdBy: true, title: true },
  });

  if (!post?.createdBy || post.createdBy === actorId) return;

  await insertNotifications(db, [
    {
      organizationId,
      userId: post.createdBy,
      type: "post_merged" as const,
      postId: sourcePostId,
      actorId,
      metadata: { postTitle: post.title, actorName },
    },
  ]);
}

// ─── autopilot_duplicate ──────────────────────────────────────────────────────
// Notifies all org admins when autopilot flags a post as a potential duplicate.

export async function notifyAutopilotDuplicate(
  db: Db,
  {
    sourcePostId,
    sourcePostTitle,
    targetPostTitle,
    confidence,
    organizationId,
  }: {
    sourcePostId: string;
    sourcePostTitle: string;
    targetPostTitle: string;
    confidence: "low" | "medium" | "high";
    organizationId: string;
  },
): Promise<void> {
  const admins = await db.query.member.findMany({
    where: and(eq(member.organizationId, organizationId), inArray(member.role, ["admin", "owner"])),
    columns: { userId: true },
  });

  if (admins.length === 0) return;

  await insertNotifications(
    db,
    admins.map((m) => ({
      organizationId,
      userId: m.userId,
      type: "autopilot_duplicate" as const,
      postId: sourcePostId,
      actorId: null,
      metadata: { postTitle: sourcePostTitle, duplicateOfTitle: targetPostTitle, confidence },
    })),
  );
}

// ─── owner_assigned ───────────────────────────────────────────────────────────
// Notifies the newly assigned owner when someone assigns them to a post.

export async function notifyOwnerAssigned(
  db: Db,
  {
    postId,
    postTitle,
    newOwnerId,
    actorId,
    organizationId,
    actorName,
  }: {
    postId: string;
    postTitle: string;
    newOwnerId: string;
    actorId: string;
    organizationId: string;
    actorName: string;
  },
): Promise<void> {
  await insertNotifications(db, [
    {
      organizationId,
      userId: newOwnerId,
      type: "owner_assigned" as const,
      postId,
      actorId,
      metadata: { postTitle, actorName },
    },
  ]);
}

// ─── vote_milestone ───────────────────────────────────────────────────────────
// Notifies the post author when a vote milestone is reached.

export async function notifyVoteMilestoneIfReached(
  db: Db,
  {
    postId,
    organizationId,
    newVoteCount,
  }: {
    postId: string;
    organizationId: string;
    newVoteCount: number;
  },
): Promise<void> {
  if (!isVoteMilestone(newVoteCount)) return;

  const post = await db.query.feedbackPosts.findFirst({
    where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
    columns: { createdBy: true, title: true },
  });

  if (!post?.createdBy) return;

  await insertNotifications(db, [
    {
      organizationId,
      userId: post.createdBy,
      type: "vote_milestone" as const,
      postId,
      actorId: null,
      metadata: { postTitle: post.title, voteCount: newVoteCount },
    },
  ]);
}
