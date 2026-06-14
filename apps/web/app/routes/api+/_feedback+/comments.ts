import { canDo, requireOrganization } from "@features/auth/server/guards";
import { notifyCustomerReplyByEmail } from "@features/internal/notifications/server/email";
import { notifyMentions, notifyNewComment } from "@features/internal/notifications/server/service";
import { dispatchWebhook } from "@features/internal/webhooks/server/dispatch";
import { createId } from "@paralleldrive/cuid2";
import { and, asc, eq } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { comments, feedbackPosts, user } from "@/db/schema";

import type { Route } from "./+types/comments";

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);

  const url = new URL(request.url);
  const postId = url.searchParams.get("postId");
  if (!postId) return data({ error: "postId required" }, { status: 400 });

  const db = getDb();

  const post = await db.query.feedbackPosts.findFirst({
    where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
  });
  if (!post) return data({ error: "Post not found" }, { status: 404 });

  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      isInternal: comments.isInternal,
      isAiGenerated: comments.isAiGenerated,
      parentId: comments.parentId,
      userId: comments.userId,
      createdAt: comments.createdAt,
      userName: user.name,
      userEmail: user.email,
      userImage: user.image,
    })
    .from(comments)
    .leftJoin(user, eq(comments.userId, user.id))
    .where(eq(comments.postId, postId))
    .orderBy(asc(comments.createdAt));

  const repliesMap = new Map<string, typeof rows>();
  for (const row of rows) {
    if (row.parentId) {
      const list = repliesMap.get(row.parentId) ?? [];
      list.push(row);
      repliesMap.set(row.parentId, list);
    }
  }

  const threaded = rows
    .filter((r) => !r.parentId)
    .map((c) => ({ ...c, replies: repliesMap.get(c.id) ?? [] }));

  return data({ comments: threaded });
}

export async function action({ request, context }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);
  const db = getDb();
  const body = (await request.json()) as { intent: string; [k: string]: unknown };

  if (body.intent === "create" || body.intent === "reply") {
    const postId = body.postId as string;
    const commentBody = (body.body as string | undefined)?.trim();
    const parentId = body.intent === "reply" ? (body.parentId as string) : null;
    const isInternal = body.isInternal === true;

    if (!postId || !commentBody) {
      return data({ error: "postId and body are required" }, { status: 400 });
    }

    const post = await db.query.feedbackPosts.findFirst({
      where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
    });
    if (!post) return data({ error: "Post not found" }, { status: 404 });

    if (parentId) {
      const parent = await db.query.comments.findFirst({
        where: and(eq(comments.id, parentId), eq(comments.postId, postId)),
      });
      if (!parent) return data({ error: "Parent comment not found" }, { status: 404 });
      if (parent.parentId) return data({ error: "Cannot reply to a reply" }, { status: 400 });
    }

    const id = createId();
    await db.insert(comments).values({
      id,
      postId,
      organizationId,
      userId: session.user.id,
      parentId,
      body: commentBody,
      isInternal,
    });

    // Only fire webhook for public comments — internal notes are private to admins
    if (!isInternal) {
      dispatchWebhook(context, organizationId, "comment.created", {
        id,
        postId,
        parentId: parentId ?? null,
        body: commentBody,
        authorId: session.user.id,
        isReply: body.intent === "reply",
      });
    }

    if (!isInternal) {
      const actorName = session.user.name ?? session.user.email ?? "Someone";
      notifyCustomerReplyByEmail({
        postId,
        organizationId,
        actorId: session.user.id,
        actorName,
        commentBody,
      }).catch((err) => console.error("[notifications] customer reply email failed", err));
      await Promise.all([
        notifyNewComment({
          postId,
          commentBody,
          actorId: session.user.id,
          organizationId,
          postTitle: post.title,
          actorName,
        }),
        notifyMentions({
          postId,
          commentBody,
          actorId: session.user.id,
          organizationId,
          postTitle: post.title,
          actorName,
        }),
      ]);
    }

    return data({ success: true, id });
  }

  if (body.intent === "delete") {
    const commentId = body.commentId as string;

    const comment = await db.query.comments.findFirst({
      where: and(eq(comments.id, commentId), eq(comments.organizationId, organizationId)),
    });
    if (!comment) return data({ error: "Comment not found" }, { status: 404 });

    const canDelete = await canDo(organizationId, session.user.id, { feedback: ["delete"] });

    if (comment.userId !== session.user.id && !canDelete) {
      return data({ error: "Not authorized" }, { status: 403 });
    }

    await db.delete(comments).where(eq(comments.parentId, commentId));
    await db.delete(comments).where(eq(comments.id, commentId));

    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
