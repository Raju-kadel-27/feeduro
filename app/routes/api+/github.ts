import {
  createGithubIssue,
  getGithubAccessToken,
  getGithubIssueByUrl,
  listGithubRepos,
} from "@lib/github/client";
import { requireOrganization } from "@lib/session.server";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { feedbackPosts, githubIntegrations, member } from "@/db/schema";
import type { Route } from "./+types/github";

async function requireAdmin(organizationId: string, userId: string) {
  const db = getDb();
  const rec = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
  });
  return rec?.role === "admin";
}

export async function loader({ request }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrganization(request);

  const db = getDb();
  const [integration, accessToken] = await Promise.all([
    db.query.githubIntegrations.findFirst({
      where: eq(githubIntegrations.organizationId, organizationId),
    }),
    getGithubAccessToken(session.user.id),
  ]);

  return data({
    integration: integration ?? null,
    githubConnected: !!accessToken,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);

  const isAdmin = await requireAdmin(organizationId, session.user.id);
  if (!isAdmin) {
    return data({ error: "Only admins can manage GitHub integration" }, { status: 403 });
  }

  const body = (await request.json()) as { intent: string; [key: string]: unknown };
  const db = getDb();

  if (body.intent === "list_repos") {
    const accessToken = await getGithubAccessToken(session.user.id);
    if (!accessToken) {
      return data({ error: "GitHub account not connected" }, { status: 400 });
    }
    try {
      const repos = await listGithubRepos(accessToken);
      return data({ repos });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to fetch repos" },
        { status: 400 },
      );
    }
  }

  if (body.intent === "save_repo") {
    const repoOwner = (body.repoOwner as string)?.trim();
    const repoName = (body.repoName as string)?.trim();
    const autoCreateIssues = !!(body.autoCreateIssues as boolean);
    if (!repoOwner || !repoName) {
      return data({ error: "repoOwner and repoName are required" }, { status: 400 });
    }

    const accessToken = await getGithubAccessToken(session.user.id);
    if (!accessToken) {
      return data({ error: "Connect your GitHub account first" }, { status: 400 });
    }

    await db
      .insert(githubIntegrations)
      .values({
        organizationId,
        repoOwner,
        repoName,
        connectedByUserId: session.user.id,
        autoCreateIssues,
      })
      .onConflictDoUpdate({
        target: githubIntegrations.organizationId,
        set: { repoOwner, repoName, autoCreateIssues, connectedByUserId: session.user.id },
      });

    return data({ success: true });
  }

  if (body.intent === "toggle_auto_create") {
    const enabled = !!(body.enabled as boolean);
    await db
      .update(githubIntegrations)
      .set({ autoCreateIssues: enabled })
      .where(eq(githubIntegrations.organizationId, organizationId));
    return data({ success: true });
  }

  if (body.intent === "disconnect") {
    await db
      .delete(githubIntegrations)
      .where(eq(githubIntegrations.organizationId, organizationId));
    return data({ success: true });
  }

  if (body.intent === "create_issue") {
    const postId = body.postId as string;
    if (!postId) return data({ error: "postId is required" }, { status: 400 });

    const [integration, post] = await Promise.all([
      db.query.githubIntegrations.findFirst({
        where: eq(githubIntegrations.organizationId, organizationId),
      }),
      db.query.feedbackPosts.findFirst({
        where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
      }),
    ]);

    if (!integration) return data({ error: "GitHub integration not configured" }, { status: 400 });
    if (!post) return data({ error: "Post not found" }, { status: 404 });
    if (post.githubIssueNumber) {
      return data({ error: "Post already linked to a GitHub issue" }, { status: 400 });
    }

    const accessToken = await getGithubAccessToken(integration.connectedByUserId);
    if (!accessToken) {
      return data(
        { error: "GitHub token not found — reconnect GitHub in settings" },
        { status: 400 },
      );
    }

    try {
      const body_text = post.description
        ? `${post.description}\n\n---\n*Created from [Feediyo](https://feediyo.com) feedback #${post.id}*`
        : `*Created from [Feediyo](https://feediyo.com) feedback #${post.id}*`;

      const issue = await createGithubIssue(
        accessToken,
        integration.repoOwner,
        integration.repoName,
        post.title,
        body_text,
      );

      await db
        .update(feedbackPosts)
        .set({ githubIssueNumber: issue.number, githubIssueUrl: issue.html_url })
        .where(eq(feedbackPosts.id, postId));

      return data({ success: true, issue });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to create issue" },
        { status: 400 },
      );
    }
  }

  if (body.intent === "link_issue") {
    const postId = body.postId as string;
    const issueUrl = (body.issueUrl as string)?.trim();
    if (!postId || !issueUrl) {
      return data({ error: "postId and issueUrl are required" }, { status: 400 });
    }

    const [integration, post] = await Promise.all([
      db.query.githubIntegrations.findFirst({
        where: eq(githubIntegrations.organizationId, organizationId),
      }),
      db.query.feedbackPosts.findFirst({
        where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
      }),
    ]);

    if (!integration) return data({ error: "GitHub integration not configured" }, { status: 400 });
    if (!post) return data({ error: "Post not found" }, { status: 404 });

    const accessToken = await getGithubAccessToken(integration.connectedByUserId);
    if (!accessToken) {
      return data(
        { error: "GitHub token not found — reconnect GitHub in settings" },
        { status: 400 },
      );
    }

    try {
      const issue = await getGithubIssueByUrl(accessToken, issueUrl);
      await db
        .update(feedbackPosts)
        .set({ githubIssueNumber: issue.number, githubIssueUrl: issue.html_url })
        .where(eq(feedbackPosts.id, postId));
      return data({ success: true, issue });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to link issue" },
        { status: 400 },
      );
    }
  }

  if (body.intent === "unlink_issue") {
    const postId = body.postId as string;
    if (!postId) return data({ error: "postId is required" }, { status: 400 });

    await db
      .update(feedbackPosts)
      .set({ githubIssueNumber: null, githubIssueUrl: null })
      .where(and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)));

    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
