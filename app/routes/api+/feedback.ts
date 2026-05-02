import { requireOrganization } from "@lib/session.server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { comments, feedbackPosts, member, postActivities, votes } from "@/db/schema";
import type { Route } from "./+types/feedback";

export async function loader({ request }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrganization(request);

  const url = new URL(request.url);
  const boardId = url.searchParams.get("boardId");
  const status = url.searchParams.get("status") as
    | "open"
    | "reviewing"
    | "planned"
    | "in-progress"
    | "completed"
    | "closed"
    | null;

  const db = getDb();

  const conditions = [eq(feedbackPosts.organizationId, organizationId)];
  if (boardId) conditions.push(eq(feedbackPosts.boardId, boardId));
  if (status) conditions.push(eq(feedbackPosts.status, status));

  const posts = await db.query.feedbackPosts.findMany({
    where: and(...conditions),
    orderBy: [desc(feedbackPosts.createdAt)],
  });

  const postIds = posts.map((p) => p.id);

  const [allVotes, commentCountRows] = await Promise.all([
    postIds.length > 0
      ? db.query.votes.findMany({ where: eq(votes.organizationId, organizationId) })
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

  const enriched = posts.map((post) => {
    const postVotes = allVotes.filter((v) => v.postId === post.id);
    return {
      ...post,
      voteCount: postVotes.length,
      hasVoted: postVotes.some((v) => v.userId === session.user.id),
      commentCount: commentCountMap[post.id] ?? 0,
    };
  });

  return data({ posts: enriched });
}

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);

  const db = getDb();
  const body = (await request.json()) as { intent: string; [key: string]: unknown };

  const memberRecord = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
  });
  const role = memberRecord?.role ?? "member";

  if (body.intent === "create") {
    if (role === "viewer") {
      return data({ error: "Viewers cannot create feedback" }, { status: 403 });
    }
    const title = (body.title as string)?.trim();
    const description = (body.description as string)?.trim();
    const boardId = body.boardId as string;

    if (!title) return data({ error: "Title is required" }, { status: 400 });
    if (!boardId) return data({ error: "Board is required" }, { status: 400 });

    const [post] = await db
      .insert(feedbackPosts)
      .values({ organizationId, boardId, title, description, createdBy: session.user.id })
      .returning({ id: feedbackPosts.id });

    return data({ success: true, id: post.id });
  }

  if (body.intent === "update_status") {
    if (role !== "admin") {
      return data({ error: "Only admins can update status" }, { status: 403 });
    }
    const id = body.id as string;
    const newStatus = body.status as
      | "open"
      | "reviewing"
      | "planned"
      | "in-progress"
      | "completed"
      | "closed";

    const existing = await db.query.feedbackPosts.findFirst({
      where: and(eq(feedbackPosts.id, id), eq(feedbackPosts.organizationId, organizationId)),
      columns: { status: true },
    });

    await db
      .update(feedbackPosts)
      .set({ status: newStatus })
      .where(and(eq(feedbackPosts.id, id), eq(feedbackPosts.organizationId, organizationId)));

    if (existing && existing.status !== newStatus) {
      try {
        await db.insert(postActivities).values({
          postId: id,
          organizationId,
          userId: session.user.id,
          type: "status_changed",
          oldValue: existing.status,
          newValue: newStatus,
        });
      } catch {
        /* table may not exist yet — run pnpm db:push */
      }
    }

    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
