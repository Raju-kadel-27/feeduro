import { requireOrganization } from "@features/auth/server/guards";
import { notifyPostMerged } from "@features/internal/notifications/server/service";
import { and, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import { data } from "react-router";
import { z } from "zod";
import { feedbackPosts, member, postActivities, votes } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/merge";

// ─── GET: search for posts eligible to merge into ────────────────────────────
// Returns active (non-merged) posts in the org matching the search query.
// Admin-only: prevents non-admins from enumerating post titles.
// Vote counts are computed live via LEFT JOIN to avoid reading stale cached column.

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);

  const memberRecord = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
    columns: { role: true },
  });
  if (memberRecord?.role !== "admin") {
    return data({ posts: [] });
  }

  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const excludePostId = url.searchParams.get("excludePostId") ?? "";

  const rows = await db
    .select({
      id: feedbackPosts.id,
      title: feedbackPosts.title,
      status: feedbackPosts.status,
      voteCount: sql<number>`count(${votes.id})`.mapWith(Number),
    })
    .from(feedbackPosts)
    .leftJoin(votes, eq(votes.postId, feedbackPosts.id))
    .where(
      and(
        eq(feedbackPosts.organizationId, organizationId),
        isNull(feedbackPosts.mergedIntoPostId),
        search ? ilike(feedbackPosts.title, `%${search}%`) : undefined,
      ),
    )
    .groupBy(feedbackPosts.id, feedbackPosts.title, feedbackPosts.status)
    .orderBy(desc(feedbackPosts.createdAt))
    .limit(9);

  const posts = rows.filter((p) => p.id !== excludePostId).slice(0, 8);
  return data({ posts });
}

// ─── POST: merge | unmerge ────────────────────────────────────────────────────

const MergeBodySchema = z.object({ intent: z.string() }).passthrough();

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);

  const memberRecord = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
  });
  if (memberRecord?.role !== "admin") {
    return data({ error: "Only admins can merge or unmerge posts" }, { status: 403 });
  }

  const parsed = MergeBodySchema.safeParse(await request.json());
  if (!parsed.success) return data({ error: "Invalid request body" }, { status: 400 });
  const body = parsed.data;

  // ── merge ──────────────────────────────────────────────────────────────────
  // Marks sourcePost as merged into targetPost and records activities on both.
  // Votes and comments are NOT moved — they stay on their original post_id and
  // are aggregated at query time.

  if (body.intent === "merge") {
    const sourcePostId = body.sourcePostId as string;
    const targetPostId = body.targetPostId as string;

    if (!sourcePostId || !targetPostId || sourcePostId === targetPostId) {
      return data({ error: "Invalid post IDs" }, { status: 400 });
    }

    const [sourcePost, targetPost] = await Promise.all([
      db.query.feedbackPosts.findFirst({
        where: and(
          eq(feedbackPosts.id, sourcePostId),
          eq(feedbackPosts.organizationId, organizationId),
        ),
        columns: { id: true, title: true, mergedIntoPostId: true },
      }),
      db.query.feedbackPosts.findFirst({
        where: and(
          eq(feedbackPosts.id, targetPostId),
          eq(feedbackPosts.organizationId, organizationId),
        ),
        columns: { id: true, title: true, mergedIntoPostId: true },
      }),
    ]);

    if (!sourcePost || !targetPost) {
      return data({ error: "Post not found" }, { status: 404 });
    }
    if (sourcePost.mergedIntoPostId) {
      return data({ error: "This post is already merged into another post" }, { status: 400 });
    }
    if (targetPost.mergedIntoPostId) {
      return data(
        { error: "Cannot merge into a post that is itself already merged" },
        { status: 400 },
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(feedbackPosts)
        .set({
          mergedIntoPostId: targetPostId,
          mergedAt: new Date(),
          mergedByUserId: session.user.id,
        })
        .where(eq(feedbackPosts.id, sourcePostId));

      await tx.insert(postActivities).values([
        {
          postId: targetPostId,
          organizationId,
          userId: session.user.id,
          type: "merged",
          newValue: sourcePost.id,
          oldValue: sourcePost.title.slice(0, 95),
        },
        {
          postId: sourcePostId,
          organizationId,
          userId: session.user.id,
          type: "merged_into",
          newValue: targetPost.id,
          oldValue: targetPost.title.slice(0, 95),
        },
      ]);
    });

    notifyPostMerged(db, {
      sourcePostId,
      actorId: session.user.id,
      organizationId,
      actorName: session.user.name ?? session.user.email ?? "Someone",
    }).catch((err) => {
      console.error("[merge] notifyPostMerged failed:", err);
    });

    return data({ success: true, targetPostId });
  }

  // ── unmerge ────────────────────────────────────────────────────────────────
  // Clears the merge relationship on sourcePost.
  // Only allowed when the surviving post (target) is itself top-level (not merged
  // into anything else), matching the Canny-style chain constraint.

  if (body.intent === "unmerge") {
    const postId = body.postId as string;
    if (!postId) return data({ error: "postId required" }, { status: 400 });

    const sourcePost = await db.query.feedbackPosts.findFirst({
      where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
      columns: { id: true, title: true, mergedIntoPostId: true },
    });

    if (!sourcePost) return data({ error: "Post not found" }, { status: 404 });
    if (!sourcePost.mergedIntoPostId) {
      return data({ error: "This post is not merged" }, { status: 400 });
    }

    const targetPost = await db.query.feedbackPosts.findFirst({
      where: eq(feedbackPosts.id, sourcePost.mergedIntoPostId),
      columns: { id: true, title: true, mergedIntoPostId: true },
    });

    if (!targetPost) return data({ error: "Surviving post not found" }, { status: 404 });
    if (targetPost.mergedIntoPostId) {
      return data(
        {
          error:
            "Cannot unmerge: the surviving post is itself merged into another post. Unmerge that first.",
        },
        { status: 400 },
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(feedbackPosts)
        .set({ mergedIntoPostId: null, mergedAt: null, mergedByUserId: null })
        .where(eq(feedbackPosts.id, postId));

      // Record activity on both posts: surviving post gets "unmerged", source
      // post gets "unmerged_from" so its own timeline shows what happened.
      await tx.insert(postActivities).values([
        {
          postId: targetPost.id,
          organizationId,
          userId: session.user.id,
          type: "unmerged",
          newValue: sourcePost.id,
          oldValue: sourcePost.title.slice(0, 95),
        },
        {
          postId: sourcePost.id,
          organizationId,
          userId: session.user.id,
          type: "unmerged_from",
          newValue: targetPost.id,
          oldValue: targetPost.title.slice(0, 95),
        },
      ]);
    });

    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
