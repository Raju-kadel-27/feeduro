import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { comments, feedbackBoards, feedbackPosts, organization, votes } from "@/db/schema";
import type { WidgetLoaderData, WidgetPost } from "../types";
import { toStatusKey } from "./queries";

/**
 * Resolves widget data by a board-level embedToken (feedbackBoards.embedToken).
 * Returns null if no matching public board is found — caller falls back to org token.
 */
export async function getBoardWidgetData(
  db: Db,
  embedToken: string,
  theme: string,
): Promise<WidgetLoaderData | null> {
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

  const validTheme = ["light", "dark", "auto"].includes(theme) ? theme : "auto";

  return {
    token: embedToken,
    org: { name: org.name ?? "", slug: org.slug ?? "" },
    board: { id: board.id, name: board.name, description: board.description ?? null },
    posts,
    theme: validTheme,
    mode: "inline",
  };
}
