import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
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

export async function getWidgetLoaderData(
  db: Db,
  widgetToken: string,
  boardSlug?: string,
  theme = "auto",
) {
  const config = await db.query.widgetConfigs.findFirst({
    where: eq(widgetConfigs.token, widgetToken),
    columns: { organizationId: true, enabled: true, boardId: true, theme: true },
  });

  if (!config?.enabled) {
    throw new Response("Not found", { status: 404 });
  }

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, config.organizationId),
    columns: { id: true, name: true, slug: true },
  });
  if (!org) throw new Response("Not found", { status: 404 });

  // Resolve board: slug param > server-configured boardId > default > first public
  let board = boardSlug
    ? await db.query.feedbackBoards.findFirst({
        where: and(
          eq(feedbackBoards.organizationId, org.id),
          eq(feedbackBoards.slug, boardSlug),
          eq(feedbackBoards.visibility, "public"),
        ),
        columns: { id: true, name: true, description: true },
      })
    : undefined;

  if (!board && config.boardId) {
    board = await db.query.feedbackBoards.findFirst({
      where: and(
        eq(feedbackBoards.id, config.boardId),
        eq(feedbackBoards.organizationId, org.id),
        eq(feedbackBoards.visibility, "public"),
      ),
      columns: { id: true, name: true, description: true },
    });
  }

  if (!board) {
    board =
      (await db.query.feedbackBoards.findFirst({
        where: and(
          eq(feedbackBoards.organizationId, org.id),
          eq(feedbackBoards.visibility, "public"),
          eq(feedbackBoards.isDefault, true),
        ),
        columns: { id: true, name: true, description: true },
      })) ??
      (await db.query.feedbackBoards.findFirst({
        where: and(
          eq(feedbackBoards.organizationId, org.id),
          eq(feedbackBoards.visibility, "public"),
        ),
        columns: { id: true, name: true, description: true },
        orderBy: [desc(feedbackBoards.createdAt)],
      }));
  }

  const validTheme = ["light", "dark", "auto"].includes(theme) ? theme : "auto";

  if (!board) {
    return {
      token: widgetToken,
      org: { name: org.name ?? "", slug: org.slug ?? "" },
      board: null,
      posts: [] as WidgetPost[],
      theme: validTheme,
          };
  }

  const rawPosts = await db.query.feedbackPosts.findMany({
    where: and(
      eq(feedbackPosts.boardId, board.id),
      eq(feedbackPosts.organizationId, org.id),
      isNull(feedbackPosts.mergedIntoPostId),
    ),
    columns: { id: true, title: true, status: true, description: true },
    orderBy: [desc(feedbackPosts.createdAt)],
    limit: 50,
  });

  const postIds = rawPosts.map((p) => p.id);

  const mergedChildRows =
    postIds.length > 0
      ? await db.query.feedbackPosts.findMany({
          where: and(
            eq(feedbackPosts.organizationId, org.id),
            inArray(feedbackPosts.mergedIntoPostId, postIds),
          ),
          columns: { id: true, mergedIntoPostId: true },
        })
      : [];

  const childMap = new Map<string, string[]>();
  for (const row of mergedChildRows) {
    if (!row.mergedIntoPostId) continue;
    const arr = childMap.get(row.mergedIntoPostId) ?? [];
    arr.push(row.id);
    childMap.set(row.mergedIntoPostId, arr);
  }

  const allRelevantIds =
    postIds.length > 0 ? [...postIds, ...mergedChildRows.map((r) => r.id)] : [];

  const [allVotes, commentCountRows] = await Promise.all([
    allRelevantIds.length > 0
      ? db.query.votes.findMany({
          where: inArray(votes.postId, allRelevantIds),
          columns: { postId: true },
        })
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

  const posts: WidgetPost[] = rawPosts.map((post) => {
    const idsForPost = new Set([post.id, ...(childMap.get(post.id) ?? [])]);
    return {
      id: post.id,
      title: post.title,
      description: post.description ?? null,
      status: toStatusKey(post.status),
      voteCount: allVotes.filter((v) => idsForPost.has(v.postId)).length,
      commentCount: commentCountMap[post.id] ?? 0,
    };
  });

  return {
    token: widgetToken,
    org: { name: org.name ?? "", slug: org.slug ?? "" },
    board: { id: board.id, name: board.name, description: board.description ?? null },
    posts,
    theme: validTheme,
      };
}
