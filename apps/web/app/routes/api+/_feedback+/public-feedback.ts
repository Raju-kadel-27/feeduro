import { autoCreateAsanaTask } from "@features/internal/integrations/asana/server/auto-create";
import { autoCreateGithubIssue } from "@features/internal/integrations/github/server/auto-create";
import { autoCreateJiraIssue } from "@features/internal/integrations/jira/server/auto-create";
import { autoCreateLinearIssue } from "@features/internal/integrations/linear/server/auto-create";
import { autoCreateClickupTask } from "@features/internal/integrations/clickup/server/auto-create";
import { autoCreateMondayItem } from "@features/internal/integrations/monday/server/auto-create";
import { autoCreateNotionPage } from "@features/internal/integrations/notion/server/auto-create";
import { autoCreateShortcutStory } from "@features/internal/integrations/shortcut/server/auto-create";
import { autoCreateTrelloCard } from "@features/internal/integrations/trello/server/auto-create";
import { dispatchWebhook } from "@features/internal/webhooks/server/dispatch";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
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

async function verifyHmacSignature(
  userId: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const sigBytes = Uint8Array.from((signature.match(/.{2}/g) ?? []).map((b) => parseInt(b, 16)));
    return await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(userId));
  } catch {
    return false;
  }
}

import type { Route } from "./+types/public-feedback";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const orgSlug = url.searchParams.get("orgSlug");
  if (!orgSlug) return data({ error: "orgSlug is required" }, { status: 400 });

  const db = getDb();

  const org = await db.query.organization.findFirst({
    where: eq(organization.slug, orgSlug),
  });
  if (!org) return data({ error: "Not found" }, { status: 404 });

  const boards = await db.query.feedbackBoards.findMany({
    where: and(eq(feedbackBoards.organizationId, org.id), eq(feedbackBoards.visibility, "public")),
    orderBy: [desc(feedbackBoards.isDefault), desc(feedbackBoards.createdAt)],
  });

  const boardIds = boards.map((b) => b.id);

  if (boardIds.length === 0) {
    return data({ boards: [], posts: [] });
  }

  const statusFilter = url.searchParams.get("status");
  const boardIdFilter = url.searchParams.get("boardId");

  const conditions = [
    eq(feedbackPosts.organizationId, org.id),
    inArray(feedbackPosts.boardId, boardIds),
    isNull(feedbackPosts.mergedIntoPostId),
  ];
  if (statusFilter) conditions.push(eq(feedbackPosts.status, statusFilter as never));
  if (boardIdFilter && boardIds.includes(boardIdFilter)) {
    conditions.push(eq(feedbackPosts.boardId, boardIdFilter));
  }

  const posts = await db.query.feedbackPosts.findMany({
    where: and(...conditions),
    orderBy: [desc(feedbackPosts.createdAt)],
  });

  const postIds = posts.map((p) => p.id);

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
      ? db.query.votes.findMany({ where: inArray(votes.postId, allRelevantIds) })
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

  return data({
    boards,
    posts: posts.map((post) => {
      const idsForPost = new Set([post.id, ...(childMap.get(post.id) ?? [])]);
      return {
        ...post,
        voteCount: allVotes.filter((v) => idsForPost.has(v.postId)).length,
        commentCount: commentCountMap[post.id] ?? 0,
      };
    }),
  });
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb();

  const body = (await request.json()) as {
    widgetToken?: string;
    orgSlug: string;
    boardId: string;
    title: string;
    description?: string;
    submitter?: { id: string; email?: string; name?: string; signature?: string };
  };

  const { widgetToken, orgSlug, boardId, title, description, submitter } = body;

  if (!orgSlug || !boardId || !title?.trim()) {
    return data({ error: "orgSlug, boardId, and title are required" }, { status: 400 });
  }

  const org = await db.query.organization.findFirst({
    where: eq(organization.slug, orgSlug),
  });
  if (!org) return data({ error: "Organization not found" }, { status: 404 });

  const board = await db.query.feedbackBoards.findFirst({
    where: and(
      eq(feedbackBoards.id, boardId),
      eq(feedbackBoards.organizationId, org.id),
      eq(feedbackBoards.visibility, "public"),
    ),
  });
  if (!board) return data({ error: "Board not found" }, { status: 404 });

  // Verify submitter identity when a signature is present
  let submitterEmail: string | null = null;
  let submitterName: string | null = null;

  if (submitter?.id && submitter.signature && widgetToken) {
    const config = await db.query.widgetConfigs.findFirst({
      where: eq(widgetConfigs.token, widgetToken),
    });
    if (config?.signingSecret) {
      const valid = await verifyHmacSignature(
        submitter.id,
        submitter.signature,
        config.signingSecret,
      );
      if (valid) {
        submitterEmail = submitter.email?.trim() || null;
        submitterName = submitter.name?.trim() || null;
      }
    }
  }

  const [post] = await db
    .insert(feedbackPosts)
    .values({
      organizationId: org.id,
      boardId,
      title: title.trim(),
      description: description?.trim() || null,
      createdBy: null,
      isPublicSubmission: true,
      submitterEmail,
      submitterName,
    })
    .returning({
      id: feedbackPosts.id,
      title: feedbackPosts.title,
      status: feedbackPosts.status,
      createdAt: feedbackPosts.createdAt,
    });

  dispatchWebhook(context, org.id, "feedback.created", {
    id: post.id,
    title: post.title,
    description: description?.trim() || null,
    boardId,
    status: post.status,
    source: "public",
    submitterEmail,
    submitterName,
    createdAt: post.createdAt,
  });

  const autoCreatePost = {
    id: post.id,
    title: post.title,
    description: description?.trim() || null,
  };
  autoCreateGithubIssue(org.id, autoCreatePost).catch((err) =>
    console.error("[github-auto-create]", err),
  );
  autoCreateJiraIssue(org.id, autoCreatePost).catch((err) =>
    console.error("[jira-auto-create]", err),
  );
  autoCreateAsanaTask(org.id, autoCreatePost).catch((err) =>
    console.error("[asana-auto-create]", err),
  );
  autoCreateShortcutStory(org.id, autoCreatePost).catch((err) =>
    console.error("[shortcut-auto-create]", err),
  );
  autoCreateTrelloCard(org.id, autoCreatePost).catch((err) =>
    console.error("[trello-auto-create]", err),
  );
  autoCreateNotionPage(org.id, autoCreatePost).catch((err) =>
    console.error("[notion-auto-create]", err),
  );
  autoCreateLinearIssue(org.id, autoCreatePost).catch((err) =>
    console.error("[linear-auto-create]", err),
  );
  autoCreateMondayItem(org.id, autoCreatePost).catch((err) =>
    console.error("[monday-auto-create]", err),
  );
  autoCreateClickupTask(org.id, autoCreatePost).catch((err) =>
    console.error("[clickup-auto-create]", err),
  );

  return data({ success: true, id: post.id });
}
