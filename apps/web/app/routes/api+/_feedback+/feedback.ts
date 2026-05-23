import { requireOrganization } from "@features/auth/server/guards";
import { runDuplicateDetection } from "@features/autopilot/server/service";
import { assignPostOwner } from "@features/feedback/server/owner";
import { getPostTagsBatch } from "@features/feedback/server/tags.server";
import { triggerSmartReply } from "@features/feedback/server/smart-replies.server";
import { autoCreateAsanaTask } from "@features/integrations/asana/server/auto-create";
import { autoCreateGithubIssue } from "@features/integrations/github/server/auto-create";
import { autoCreateJiraIssue } from "@features/integrations/jira/server/auto-create";
import { autoCreateLinearIssue } from "@features/integrations/linear/server/auto-create";
import { autoCreateMondayItem } from "@features/integrations/monday/server/auto-create";
import { autoCreateNotionPage } from "@features/integrations/notion/server/auto-create";
import { autoCreateShortcutStory } from "@features/integrations/shortcut/server/auto-create";
import { autoCreateTrelloCard } from "@features/integrations/trello/server/auto-create";
import { notifyNewPost, notifyStatusChanged } from "@features/notifications/server/service";
import { getVoterTraitCountsByPost } from "@features/segmentation/server/service";
import type { VoterTraitCounts } from "@features/segmentation/types";
import { dispatchWebhook } from "@features/webhooks/server/dispatch";
import { getEnv } from "@utils/get-env";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import {
  comments,
  feedbackBoards,
  feedbackPosts,
  integrations,
  member,
  postActivities,
  postExternalLinks,
  reactions,
  user,
  votes,
} from "@/db/schema";
import type { Route } from "./+types/feedback";

const EMPTY_TRAITS: VoterTraitCounts = { plan: {}, role: {}, industry: {}, location: {} };

export async function loader({ request }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrganization(request);

  const url = new URL(request.url);

  // Single-post detail for the slide-over panel
  const postId = url.searchParams.get("postId");
  if (postId) {
    const db = getDb();
    const post = await db.query.feedbackPosts.findFirst({
      where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
    });
    if (!post) return data(null, { status: 404 });

    const [
      board,
      voteCountRow,
      currentVote,
      reactionCountRows,
      myReactionRows,
      authorRow,
      memberRecord,
      linearLinkRow,
      linearIntegration,
      jiraLinkRow,
      jiraIntegration,
      asanaLinkRow,
      asanaIntegration,
      ownerRow,
      orgAdminRows,
    ] = await Promise.all([
      db.query.feedbackBoards.findFirst({
        where: eq(feedbackBoards.id, post.boardId),
        columns: { slug: true, name: true, visibility: true },
      }),
      db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(votes)
        .where(eq(votes.postId, postId)),
      db.query.votes.findFirst({
        where: and(eq(votes.postId, postId), eq(votes.userId, session.user.id)),
      }),
      db
        .select({ type: reactions.type, count: sql<number>`count(*)`.mapWith(Number) })
        .from(reactions)
        .where(eq(reactions.postId, postId))
        .groupBy(reactions.type),
      db
        .select({ type: reactions.type })
        .from(reactions)
        .where(and(eq(reactions.postId, postId), eq(reactions.userId, session.user.id))),
      post.createdBy
        ? db.query.user.findFirst({ where: eq(user.id, post.createdBy) })
        : Promise.resolve(null),
      db.query.member.findFirst({
        where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      }),
      db.query.postExternalLinks.findFirst({
        where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "linear")),
        columns: { identifier: true, externalTitle: true, externalStatus: true, externalUrl: true },
      }),
      db.query.integrations.findFirst({
        where: and(
          eq(integrations.organizationId, organizationId),
          eq(integrations.provider, "linear"),
        ),
        columns: { id: true },
      }),
      db.query.postExternalLinks.findFirst({
        where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "jira")),
        columns: { identifier: true, externalTitle: true, externalStatus: true, externalUrl: true },
      }),
      db.query.integrations.findFirst({
        where: and(
          eq(integrations.organizationId, organizationId),
          eq(integrations.provider, "jira"),
        ),
        columns: { id: true },
      }),
      db.query.postExternalLinks.findFirst({
        where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "asana")),
        columns: { identifier: true, externalTitle: true, externalStatus: true, externalUrl: true },
      }),
      db.query.integrations.findFirst({
        where: and(
          eq(integrations.organizationId, organizationId),
          eq(integrations.provider, "asana"),
        ),
        columns: { id: true },
      }),
      post.ownerId
        ? db.query.user.findFirst({
            where: eq(user.id, post.ownerId),
            columns: { id: true, name: true, image: true },
          })
        : Promise.resolve(null),
      db
        .select({ id: member.userId, name: user.name, image: user.image })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(eq(member.organizationId, organizationId)),
    ]);

    let mergedIntoPost: { id: string; title: string } | null = null;
    let mergedChildren: { id: string; title: string; createdAt: string }[] = [];
    let canUnmerge = false;

    try {
      if (post.mergedIntoPostId) {
        const parent = await db.query.feedbackPosts.findFirst({
          where: eq(feedbackPosts.id, post.mergedIntoPostId),
          columns: { id: true, title: true, mergedIntoPostId: true },
        });
        if (parent) {
          mergedIntoPost = { id: parent.id, title: parent.title };
          canUnmerge = !parent.mergedIntoPostId;
        }
      }
      const childRows = await db.query.feedbackPosts.findMany({
        where: and(
          eq(feedbackPosts.organizationId, organizationId),
          eq(feedbackPosts.mergedIntoPostId, postId),
        ),
        columns: { id: true, title: true, createdAt: true },
        orderBy: [asc(feedbackPosts.createdAt)],
      });
      mergedChildren = childRows.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }));
    } catch {
      /* no-op */
    }

    const reactionCountMap = Object.fromEntries(reactionCountRows.map((r) => [r.type, r.count]));
    const myReactionSet = new Set(myReactionRows.map((r) => r.type));

    return data({
      postDetail: {
        ...post,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        voteCount: voteCountRow[0]?.count ?? 0,
        hasVoted: !!currentVote,
        reactionCounts: reactionCountMap as Record<string, number>,
        myReactions: [...myReactionSet] as string[],
        authorName: authorRow?.name ?? authorRow?.email ?? "Unknown",
        authorImage: authorRow?.image ?? null,
        aiSummary: post.aiSummary ?? null,
        aiSummaryGeneratedAt: post.aiSummaryGeneratedAt?.toISOString() ?? null,
        ownerId: post.ownerId ?? null,
        ownerName: ownerRow?.name ?? null,
        ownerImage: ownerRow?.image ?? null,
      },
      board: {
        name: board?.name ?? "General",
        slug: board?.slug ?? "general",
        visibility: board?.visibility ?? "public",
      },
      currentRole: memberRecord?.role ?? "member",
      linearLink: linearLinkRow
        ? {
            identifier: linearLinkRow.identifier ?? null,
            externalTitle: linearLinkRow.externalTitle ?? null,
            externalStatus: linearLinkRow.externalStatus ?? null,
            externalUrl: linearLinkRow.externalUrl ?? null,
          }
        : null,
      linearConnected: !!linearIntegration,
      jiraLink: jiraLinkRow
        ? {
            identifier: jiraLinkRow.identifier ?? null,
            externalTitle: jiraLinkRow.externalTitle ?? null,
            externalStatus: jiraLinkRow.externalStatus ?? null,
            externalUrl: jiraLinkRow.externalUrl ?? null,
          }
        : null,
      jiraConnected: !!jiraIntegration,
      asanaLink: asanaLinkRow
        ? {
            identifier: asanaLinkRow.identifier ?? null,
            externalTitle: asanaLinkRow.externalTitle ?? null,
            externalStatus: asanaLinkRow.externalStatus ?? null,
            externalUrl: asanaLinkRow.externalUrl ?? null,
          }
        : null,
      asanaConnected: !!asanaIntegration,
      mergedIntoPost,
      mergedChildren,
      canUnmerge,
      orgAdmins: orgAdminRows,
    });
  }

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

  const conditions = [
    eq(feedbackPosts.organizationId, organizationId),
    isNull(feedbackPosts.mergedIntoPostId), // hide merged posts from board listings
  ];
  if (boardId) conditions.push(eq(feedbackPosts.boardId, boardId));
  if (status) conditions.push(eq(feedbackPosts.status, status));

  const posts = await db.query.feedbackPosts.findMany({
    where: and(...conditions),
    orderBy: [desc(feedbackPosts.createdAt)],
  });

  const postIds = posts.map((p) => p.id);

  const [allVotes, commentCountRows, voterTraitCounts, postTagRows] = await Promise.all([
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
    postIds.length > 0
      ? getVoterTraitCountsByPost(organizationId, postIds)
      : Promise.resolve({} as Record<string, VoterTraitCounts>),
    postIds.length > 0 ? getPostTagsBatch(postIds) : Promise.resolve([]),
  ]);

  const commentCountMap = Object.fromEntries(commentCountRows.map((r) => [r.postId, r.count]));
  const tagsByPost: Record<string, string[]> = {};
  for (const row of postTagRows) {
    if (!tagsByPost[row.postId]) tagsByPost[row.postId] = [];
    tagsByPost[row.postId].push(row.id);
  }

  const enriched = posts.map((post) => {
    const postVotes = allVotes.filter((v) => v.postId === post.id);
    return {
      ...post,
      voteCount: postVotes.length,
      hasVoted: postVotes.some((v) => v.userId === session.user.id),
      commentCount: commentCountMap[post.id] ?? 0,
      voterTraitCounts: voterTraitCounts[post.id] ?? EMPTY_TRAITS,
      tagIds: tagsByPost[post.id] ?? [],
    };
  });

  return data({ posts: enriched });
}

export async function action({ request, context }: Route.ActionArgs) {
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
    const categoryId = (body.categoryId as string | undefined) || undefined;

    if (!title) return data({ error: "Title is required" }, { status: 400 });
    if (!boardId) return data({ error: "Board is required" }, { status: 400 });

    const [post] = await db
      .insert(feedbackPosts)
      .values({
        organizationId,
        boardId,
        title,
        description,
        categoryId,
        createdBy: session.user.id,
      })
      .returning({
        id: feedbackPosts.id,
        title: feedbackPosts.title,
        boardId: feedbackPosts.boardId,
        status: feedbackPosts.status,
        createdAt: feedbackPosts.createdAt,
      });

    dispatchWebhook(context, organizationId, "feedback.created", {
      id: post.id,
      title: post.title,
      description: description ?? null,
      boardId: post.boardId,
      status: post.status,
      createdBy: session.user.id,
      source: "internal",
      createdAt: post.createdAt,
    });

    notifyNewPost({
      postId: post.id,
      postTitle: post.title,
      actorId: session.user.id,
      organizationId,
      actorName: session.user.name ?? session.user.email ?? "Someone",
    }).catch(() => {});

    const groqApiKey = getEnv().GROQ_API_KEY;
    if (groqApiKey) {
      triggerSmartReply(
        db,
        {
          id: post.id,
          title: post.title,
          description: description ?? null,
          boardId: post.boardId,
          organizationId,
        },
        groqApiKey,
      ).catch((err) => console.error("[smart-reply]", err));

      runDuplicateDetection(
        {
          id: post.id,
          title: post.title,
          description: description ?? null,
          boardId: post.boardId,
          organizationId,
        },
        groqApiKey,
      ).catch((err) => console.error("[duplicate-detection]", err));
    }

    const autoCreatePost = { id: post.id, title: post.title, description: description ?? null };
    autoCreateGithubIssue(organizationId, autoCreatePost, session.user.id).catch((err) =>
      console.error("[github-auto-create]", err),
    );
    autoCreateJiraIssue(organizationId, autoCreatePost, session.user.id).catch((err) =>
      console.error("[jira-auto-create]", err),
    );
    autoCreateAsanaTask(organizationId, autoCreatePost, session.user.id).catch((err) =>
      console.error("[asana-auto-create]", err),
    );
    autoCreateShortcutStory(organizationId, autoCreatePost, session.user.id).catch((err) =>
      console.error("[shortcut-auto-create]", err),
    );
    autoCreateTrelloCard(organizationId, autoCreatePost, session.user.id).catch((err) =>
      console.error("[trello-auto-create]", err),
    );
    autoCreateNotionPage(organizationId, autoCreatePost, session.user.id).catch((err) =>
      console.error("[notion-auto-create]", err),
    );
    autoCreateLinearIssue(organizationId, autoCreatePost, session.user.id).catch((err) =>
      console.error("[linear-auto-create]", err),
    );
    autoCreateMondayItem(organizationId, autoCreatePost, session.user.id).catch((err) =>
      console.error("[monday-auto-create]", err),
    );

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
      columns: { status: true, title: true },
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

      dispatchWebhook(context, organizationId, "feedback.status_changed", {
        id,
        oldStatus: existing.status,
        newStatus,
        changedBy: session.user.id,
      });

      notifyStatusChanged({
        postId: id,
        postTitle: existing.title,
        oldStatus: existing.status,
        newStatus,
        actorId: session.user.id,
        organizationId,
        actorName: session.user.name ?? session.user.email ?? "Someone",
      }).catch(() => {});
    }

    return data({ success: true });
  }

  if (body.intent === "assign_owner") {
    if (role !== "admin") {
      return data({ error: "Only admins can assign post owners" }, { status: 403 });
    }
    const id = body.id as string;
    const newOwnerId = (body.ownerId as string | null) ?? null;
    if (!id) return data({ error: "Post id is required" }, { status: 400 });

    const result = await assignPostOwner({
      postId: id,
      organizationId,
      actorId: session.user.id,
      actorName: session.user.name ?? session.user.email ?? "Someone",
      newOwnerId,
    });

    if (result.error) return data({ error: result.error }, { status: 400 });
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
