import { verifyGithubWebhookSignature } from "@features/internal/integrations/github/server/client";
import type { GithubSettings } from "@features/internal/integrations/github/server/schemas";
import { parseSettings } from "@features/internal/integrations/server/queries";
import { insertNotification } from "@features/internal/notifications/server/mutations";
import { and, eq } from "drizzle-orm";
import { getDb, withTransaction } from "@/db";
import { feedbackPosts, integrations, postExternalLinks } from "@/db/schema";

import type { Route } from "./+types/github.webhook";

const LOG = "[github-webhook]";

type GithubIssuePayload = {
  action: string;
  issue: {
    number: number;
    title: string;
    state: string;
  };
};

// POST /api/github/webhook?orgId=<feeduro-org-id>
// Called by GitHub when an issue event fires in the connected repository.
export async function action({ request }: Route.ActionArgs) {
  const event = request.headers.get("X-GitHub-Event");
  const rawBody = await request.text();
  const signature = request.headers.get("X-Hub-Signature-256") ?? "";

  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");

  console.log(`${LOG} event=${event} orgId=${orgId} hasSignature=${!!signature}`);

  if (!orgId) {
    console.error(`${LOG} rejected: missing orgId`);
    return new Response("Missing orgId", { status: 400 });
  }

  if (event === "ping") {
    console.log(`${LOG} ping received for orgId=${orgId}`);
    return new Response("OK", { status: 200 });
  }

  if (event !== "issues") {
    console.log(`${LOG} ignored event=${event}`);
    return new Response("OK", { status: 200 });
  }

  const db = getDb();

  const integration = await db.query.integrations.findFirst({
    where: and(eq(integrations.organizationId, orgId), eq(integrations.provider, "github")),
    columns: { settings: true },
  });

  if (!integration) {
    console.error(`${LOG} no integration found for orgId=${orgId}`);
    return new Response("Integration not found", { status: 404 });
  }

  const settings = parseSettings<GithubSettings>(integration.settings);

  if (!settings?.webhookSecret) {
    console.error(
      `${LOG} no webhookSecret in settings for orgId=${orgId} — re-save the repo in Settings to register the webhook`,
    );
    return new Response("Webhook not configured", { status: 400 });
  }

  const valid = await verifyGithubWebhookSignature(rawBody, signature, settings.webhookSecret);
  if (!valid) {
    console.error(`${LOG} invalid signature for orgId=${orgId}`);
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: GithubIssuePayload;
  try {
    payload = JSON.parse(rawBody) as GithubIssuePayload;
  } catch {
    console.error(`${LOG} invalid JSON body`);
    return new Response("Invalid JSON", { status: 400 });
  }

  const { action: issueAction, issue } = payload;

  console.log(`${LOG} action=${issueAction} issue=#${issue.number} orgId=${orgId}`);

  if (!["closed", "reopened", "edited"].includes(issueAction)) {
    return new Response("OK", { status: 200 });
  }

  const link = await db.query.postExternalLinks.findFirst({
    where: and(
      eq(postExternalLinks.externalId, String(issue.number)),
      eq(postExternalLinks.provider, "github"),
      eq(postExternalLinks.organizationId, orgId),
    ),
    columns: { id: true, postId: true },
  });

  if (!link) {
    console.log(`${LOG} no linked post for issue=#${issue.number} orgId=${orgId} — skipping`);
    return new Response("OK", { status: 200 });
  }

  const post = await db.query.feedbackPosts.findFirst({
    where: and(eq(feedbackPosts.id, link.postId), eq(feedbackPosts.organizationId, orgId)),
    columns: { title: true, createdBy: true, status: true },
  });

  if (!post) {
    console.error(`${LOG} post not found postId=${link.postId} — skipping`);
    return new Response("OK", { status: 200 });
  }

  console.log(
    `${LOG} syncing issue=#${issue.number} → postId=${link.postId} action=${issueAction}`,
  );

  const newStatus =
    issueAction === "closed" ? "completed" : issueAction === "reopened" ? "open" : null;

  await withTransaction(async (tx) => {
    await tx
      .update(postExternalLinks)
      .set({ externalStatus: issue.state, externalTitle: issue.title, lastSyncedAt: new Date() })
      .where(eq(postExternalLinks.id, link.id));

    if (newStatus) {
      await tx
        .update(feedbackPosts)
        .set({ status: newStatus })
        .where(and(eq(feedbackPosts.id, link.postId), eq(feedbackPosts.organizationId, orgId)));
    }
  });

  if (newStatus && post.createdBy) {
    await insertNotification({
      organizationId: orgId,
      userId: post.createdBy,
      type: "status_changed",
      postId: link.postId,
      actorId: null,
      metadata: {
        postTitle: post.title,
        oldStatus: post.status,
        newStatus,
        actorName: "GitHub",
      },
    }).catch((err) => console.error(`${LOG} failed to insert notification:`, err));
  }

  console.log(`${LOG} done — issue=#${issue.number} postId=${link.postId} action=${issueAction}`);
  return new Response("OK", { status: 200 });
}
