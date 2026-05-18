import type { JiraSettings } from "@features/integrations/jira/server/schemas";
import { parseSettings } from "@features/integrations/server/queries";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackPosts, integrations, postExternalLinks } from "@/db/schema";
import type { Route } from "./+types/jira.webhook";

type JiraWebhookPayload = {
  webhookEvent: string;
  issue?: {
    id: string;
    key: string;
    fields?: {
      summary?: string;
      status?: {
        id: string;
        name: string;
      };
    };
  };
  changelog?: {
    items: Array<{
      field: string;
      fromString: string;
      toString: string;
    }>;
  };
};

// POST /api/jira/webhook?orgId=<feediyo-org-id>&secret=<webhook-secret>
// Called by Jira when an issue is created/updated in the connected project.
export async function action({ request }: Route.ActionArgs) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");
  const secret = url.searchParams.get("secret");

  if (!orgId || !secret) {
    return new Response("Missing orgId or secret", { status: 400 });
  }

  const db = getDb();

  const integration = await db.query.integrations.findFirst({
    where: and(eq(integrations.organizationId, orgId), eq(integrations.provider, "jira")),
  });

  if (!integration) {
    return new Response("Integration not found", { status: 404 });
  }

  const settings = parseSettings<JiraSettings>(integration.settings);

  if (!settings?.webhookSecret || settings.webhookSecret !== secret) {
    return new Response("Invalid secret", { status: 401 });
  }

  let payload: JiraWebhookPayload;
  try {
    payload = (await request.json()) as JiraWebhookPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { webhookEvent, issue, changelog } = payload;

  // Only process issue events that have an issue object
  if (!issue || !webhookEvent.startsWith("jira:issue_")) {
    return new Response("OK", { status: 200 });
  }

  // Handle issue deletion — remove the link
  if (webhookEvent === "jira:issue_deleted") {
    await db
      .delete(postExternalLinks)
      .where(
        and(
          eq(postExternalLinks.externalId, issue.id),
          eq(postExternalLinks.provider, "jira"),
          eq(postExternalLinks.organizationId, orgId),
        ),
      );
    return new Response("OK", { status: 200 });
  }

  // For updates: only act if there's a status or summary change
  if (webhookEvent === "jira:issue_updated" && changelog) {
    const hasStatusChange = changelog.items.some((i) => i.field === "status");
    const hasSummaryChange = changelog.items.some((i) => i.field === "summary");
    if (!hasStatusChange && !hasSummaryChange) {
      return new Response("OK", { status: 200 });
    }
  }

  const link = await db.query.postExternalLinks.findFirst({
    where: and(
      eq(postExternalLinks.externalId, issue.id),
      eq(postExternalLinks.provider, "jira"),
      eq(postExternalLinks.organizationId, orgId),
    ),
  });

  if (!link) {
    return new Response("OK", { status: 200 });
  }

  const newStatusName = issue.fields?.status?.name;
  const newSummary = issue.fields?.summary;

  await db
    .update(postExternalLinks)
    .set({
      ...(newStatusName ? { externalStatus: newStatusName } : {}),
      ...(newSummary ? { externalTitle: newSummary } : {}),
      lastSyncedAt: new Date(),
    })
    .where(eq(postExternalLinks.id, link.id));

  // Apply status mapping to update the Feediyo post status
  if (newStatusName) {
    const mappings = settings.statusMappings ?? [];
    const match = mappings.find((m) => m.jiraStatusName === newStatusName);
    if (match?.feediyoStatus) {
      await db
        .update(feedbackPosts)
        .set({ status: match.feediyoStatus as typeof feedbackPosts.$inferSelect.status })
        .where(and(eq(feedbackPosts.id, link.postId), eq(feedbackPosts.organizationId, orgId)));
    }
  }

  return new Response("OK", { status: 200 });
}
