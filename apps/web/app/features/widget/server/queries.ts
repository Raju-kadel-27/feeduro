import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import {
  comments,
  feedbackBoards,
  feedbackPosts,
  organization,
  votes,
  widgetConfigs,
} from "@/db/schema";
import type { StatusKey } from "../constants";
import type { WidgetPost } from "../types";

export function toStatusKey(dbStatus: string): StatusKey {
  const map: Record<string, StatusKey> = {
    open: "pending",
    reviewing: "reviewing",
    planned: "planned",
    "in-progress": "inprogress",
    completed: "completed",
    closed: "closed",
  };
  return map[dbStatus] ?? "pending";
}

export async function getWidgetLoaderData(widgetToken: string, mode: "popup" | "inline" = "popup") {
  const db = getDb();

  const config = await db.query.widgetConfigs.findFirst({
    where: eq(widgetConfigs.token, widgetToken),
  });

  if (!config?.enabled) {
    throw new Response("Not found", { status: 404 });
  }

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, config.organizationId),
  });
  if (!org) throw new Response("Not found", { status: 404 });

  // Resolve which board to show: configured > default > first public
  let board = config.boardId
    ? await db.query.feedbackBoards.findFirst({
        where: and(
          eq(feedbackBoards.id, config.boardId),
          eq(feedbackBoards.organizationId, org.id),
          eq(feedbackBoards.visibility, "public"),
        ),
      })
    : undefined;

  if (!board) {
    board =
      (await db.query.feedbackBoards.findFirst({
        where: and(
          eq(feedbackBoards.organizationId, org.id),
          eq(feedbackBoards.visibility, "public"),
          eq(feedbackBoards.isDefault, true),
        ),
      })) ??
      (await db.query.feedbackBoards.findFirst({
        where: and(
          eq(feedbackBoards.organizationId, org.id),
          eq(feedbackBoards.visibility, "public"),
        ),
        orderBy: [desc(feedbackBoards.createdAt)],
      }));
  }

  if (!board) {
    return {
      token: widgetToken,
      org: { name: org.name ?? "", slug: org.slug ?? "" },
      board: null,
      posts: [] as WidgetPost[],
      theme: config.theme,
      mode,
    };
  }

  const rawPosts = await db.query.feedbackPosts.findMany({
    where: and(eq(feedbackPosts.boardId, board.id), eq(feedbackPosts.organizationId, org.id)),
    orderBy: [desc(feedbackPosts.createdAt)],
    limit: 50,
  });

  const postIds = rawPosts.map((p) => p.id);

  const [allVotes, commentCountRows] = await Promise.all([
    postIds.length > 0
      ? db.query.votes.findMany({ where: inArray(votes.postId, postIds) })
      : Promise.resolve([]),
    postIds.length > 0
      ? db
          .select({
            postId: comments.postId,
            count: sql<number>`count(*)`.mapWith(Number),
          })
          .from(comments)
          .where(inArray(comments.postId, postIds))
          .groupBy(comments.postId)
      : Promise.resolve([]),
  ]);

  const commentCountMap = Object.fromEntries(commentCountRows.map((r) => [r.postId, r.count]));

  const posts: WidgetPost[] = rawPosts.map((post) => ({
    id: post.id,
    title: post.title,
    status: toStatusKey(post.status),
    voteCount: allVotes.filter((v) => v.postId === post.id).length,
    commentCount: commentCountMap[post.id] ?? 0,
  }));

  return {
    token: widgetToken,
    org: { name: org.name ?? "", slug: org.slug ?? "" },
    board: { id: board.id, name: board.name, description: board.description ?? null },
    posts,
    theme: config.theme,
    mode,
  };
}
