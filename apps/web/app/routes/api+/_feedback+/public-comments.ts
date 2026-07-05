import { generateUserAlias } from "@features/feedback/utils";
import { notifyMentions, notifyNewComment } from "@features/internal/notifications/server/service";
import { getSession } from "@lib/session";
import { createId } from "@paralleldrive/cuid2";
import { and, asc, eq, inArray } from "drizzle-orm";
import { data } from "react-router";
import { comments, feedbackBoards, feedbackPosts, member, organization, user } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/public-comments";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const url = new URL(request.url);
  const postId = url.searchParams.get("postId");
  const orgSlug = url.searchParams.get("orgSlug");
  if (!postId || !orgSlug) return data({ error: "postId and orgSlug required" }, { status: 400 });

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
    columns: { id: true, anonymizeUsers: true },
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

  // Determine which comment authors are org members (shown by real name even on anonymous boards)
  const uniqueUserIds = [...new Set(rows.map((r) => r.userId).filter((id): id is string => id != null))];
  const orgMembers = uniqueUserIds.length > 0
    ? await db
        .select({ userId: member.userId })
        .from(member)
        .where(and(eq(member.organizationId, org.id), inArray(member.userId, uniqueUserIds)))
    : [];
  const memberIds = new Set(orgMembers.map((m) => m.userId));

  function resolveAuthorName(userId: string | null, rawName: string | null): string {
    if (!userId) return "Anonymous";
    if (board.anonymizeUsers && !memberIds.has(userId)) return generateUserAlias(userId);
    return rawName ?? "Anonymous";
  }

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
      authorName: resolveAuthorName(c.userId, c.authorName),
      authorImage: board.anonymizeUsers && !memberIds.has(c.userId ?? "") ? null : c.authorImage,
      isTeamMember: memberIds.has(c.userId ?? ""),
      createdAt: c.createdAt?.toISOString() ?? "",
      replies: (repliesMap.get(c.id) ?? []).map((r) => ({
        ...r,
        authorName: resolveAuthorName(r.userId, r.authorName),
        authorImage: board.anonymizeUsers && !memberIds.has(r.userId ?? "") ? null : r.authorImage,
        isTeamMember: memberIds.has(r.userId ?? ""),
        createdAt: r.createdAt?.toISOString() ?? "",
      })),
    }));

  return data({ comments: threaded });
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const session = await getSession(db, request);
  if (!session) return data({ error: "Unauthorized" }, { status: 401 });

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
    notifyNewComment(db, {
      postId,
      commentBody: commentBody.trim(),
      actorId: session.user.id,
      organizationId: org.id,
      postTitle: post.title,
      actorName,
    }),
    notifyMentions(db, {
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
