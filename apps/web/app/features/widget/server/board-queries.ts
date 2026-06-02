import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { comments, feedbackBoards, feedbackPosts, organization, votes } from "@/db/schema";
import type { WidgetLoaderData, WidgetPost } from "../types";
import { toStatusKey } from "./queries";

/**
 * Resolves widget data by a board-level embedToken (feedbackBoards.embedToken).
 * Returns null if no matching public board is found — caller falls back to org token.
 */
export async function getBoardWidgetData(
  embedToken: string,
  mode: "popup" | "inline",
  theme: string,
): Promise<WidgetLoaderData | null> {
  const db = getDb();

  const board = await db.query.feedbackBoards.findFirst({
    where: and(eq(feedbackBoards.embedToken, embedToken), eq(feedbackBoards.visibility, "public")),
    columns: {
      id: true,
      name: true,
      description: true,
      organizationId: true,
    },
  });

  if (!board) return null;

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, board.organizationId),
    columns: { id: true, name: true, slug: true },
  });
  if (!org) return null;

  const rawPosts = await db.query.feedbackPosts.findMany({
    where: and(
      eq(feedbackPosts.boardId, board.id),
      eq(feedbackPosts.organizationId, org.id),
    ),
    columns: { id: true, title: true, status: true },
    orderBy: [desc(feedbackPosts.createdAt)],
    limit: 50,
  });

  const postIds = rawPosts.map((p) => p.id);

  const [allVotes, commentCountRows] = await Promise.all([
    postIds.length > 0
      ? db.query.votes.findMany({
          where: inArray(votes.postId, postIds),
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

  const posts: WidgetPost[] = rawPosts.map((post) => ({
    id: post.id,
    title: post.title,
    status: toStatusKey(post.status),
    voteCount: allVotes.filter((v) => v.postId === post.id).length,
    commentCount: commentCountMap[post.id] ?? 0,
  }));

  const validTheme = ["light", "dark", "auto"].includes(theme) ? theme : "auto";

  return {
    token: embedToken,
    org: { name: org.name ?? "", slug: org.slug ?? "" },
    board: { id: board.id, name: board.name, description: board.description ?? null },
    posts,
    theme: validTheme,
    mode,
  };
}
