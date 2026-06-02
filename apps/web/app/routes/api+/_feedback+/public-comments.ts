import { notifyMentions, notifyNewComment } from "@features/notifications/server/service";
import { getSession } from "@lib/session";
import { createId } from "@paralleldrive/cuid2";
import { and, asc, eq } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { comments, feedbackBoards, feedbackPosts, organization, user } from "@/db/schema";

import type { Route } from "./+types/public-comments";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const postId = url.searchParams.get("postId");
  const orgSlug = url.searchParams.get("orgSlug");
  if (!postId || !orgSlug) return data({ error: "postId and orgSlug required" }, { status: 400 });

  const db = getDb();

  const org = await db.query.organization.findFirst({
    where: eq(organization.slug, orgSlug),
    columns: { id: true },
  });
  if (!org) return data({ error: "Not found" }, { status: 404 });

  const post = await db.query.feedbackPosts.findFirst({
    where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, org.id)),
    columns: { id: true, boardId: true },
  });
  if (!post) return data({ error: "Not found" }, { status: 404 });

  const board = await db.query.feedbackBoards.findFirst({
    where: and(eq(feedbackBoards.id, post.boardId), eq(feedbackBoards.visibility, "public")),
    columns: { id: true },
  });
  if (!board) return data({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      parentId: comments.parentId,
      userId: comments.userId,
      createdAt: comments.createdAt,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(comments)
    .leftJoin(user, eq(comments.userId, user.id))
    .where(and(eq(comments.postId, postId), eq(comments.isInternal, false)))
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
    .map((c) => ({
      ...c,
      createdAt: c.createdAt?.toISOString() ?? "",
      replies: (repliesMap.get(c.id) ?? []).map((r) => ({
        ...r,
        createdAt: r.createdAt?.toISOString() ?? "",
      })),
    }));

  return data({ comments: threaded });
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request);
  if (!session) return data({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const body = (await request.json()) as { postId?: string; orgSlug?: string; body?: string };
  const { postId, orgSlug, body: commentBody } = body;

  if (!postId || !orgSlug || !commentBody?.trim()) {
    return data({ error: "postId, orgSlug, and body are required" }, { status: 400 });
  }

  const org = await db.query.organization.findFirst({
    where: eq(organization.slug, orgSlug),
    columns: { id: true },
  });
  if (!org) return data({ error: "Not found" }, { status: 404 });

  const post = await db.query.feedbackPosts.findFirst({
    where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, org.id)),
    columns: { id: true, title: true, boardId: true },
  });
  if (!post) return data({ error: "Not found" }, { status: 404 });

  const board = await db.query.feedbackBoards.findFirst({
    where: and(eq(feedbackBoards.id, post.boardId), eq(feedbackBoards.visibility, "public")),
    columns: { id: true },
  });
  if (!board) return data({ error: "Not found" }, { status: 404 });

  const id = createId();
  await db.insert(comments).values({
    id,
    postId,
    organizationId: org.id,
    userId: session.user.id,
    parentId: null,
    body: commentBody.trim(),
    isInternal: false,
  });

  const actorName = session.user.name ?? session.user.email ?? "Someone";
  await Promise.all([
    notifyNewComment({
      postId,
      commentBody: commentBody.trim(),
      actorId: session.user.id,
      organizationId: org.id,
      postTitle: post.title,
      actorName,
    }),
    notifyMentions({
      postId,
      commentBody: commentBody.trim(),
      actorId: session.user.id,
      organizationId: org.id,
      postTitle: post.title,
      actorName,
    }),
  ]);

  return data({ success: true, id });
}
