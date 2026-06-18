import type { JiraSettings } from "@features/internal/integrations/jira/server/schemas";
import { parseSettings } from "@features/internal/integrations/server/queries";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackPosts, integrations, postExternalLinks } from "@/db/schema";
import type { Route } from "./+types/jira.webhook";

const LOG = "[jira-webhook]";

type FeeduroStatus = "open" | "reviewing" | "planned" | "in-progress" | "completed" | "closed";

type JiraStatusCategoryKey = "new" | "indeterminate" | "done" | "undefined";

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
        statusCategory?: {
          key: JiraStatusCategoryKey;
          name: string;
        };
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

// Default mapping by Jira status category — used when no statusMappings are configured.
const CATEGORY_TO_FEEDURO: Partial<Record<JiraStatusCategoryKey, FeeduroStatus>> = {
  new: "open",
  indeterminate: "in-progress",
  done: "completed",
};

function resolveStatus(
  statusName: string,
  categoryKey: JiraStatusCategoryKey | undefined,
  mappings: JiraSettings["statusMappings"],
): FeeduroStatus | null {
  // User-configured name match takes priority
  const nameMatch = mappings?.find((m) => m.jiraStatusName === statusName);
  if (nameMatch?.feeduroStatus) return nameMatch.feeduroStatus as FeeduroStatus;

  // Fall back to category-based defaults
  if (categoryKey) return CATEGORY_TO_FEEDURO[categoryKey] ?? null;
  return null;
}

// POST /api/jira/webhook?orgId=<feeduro-org-id>&secret=<webhook-secret>
export async function action({ request }: Route.ActionArgs) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");
  const secret = url.searchParams.get("secret");

  if (!orgId || !secret) {
    console.error(`${LOG} rejected: missing orgId or secret`);
    return new Response("Missing orgId or secret", { status: 400 });
  }

  const db = getDb();

  const integration = await db.query.integrations.findFirst({
    where: and(eq(integrations.organizationId, orgId), eq(integrations.provider, "jira")),
    columns: { settings: true },
  });

  if (!integration) {
    console.error(`${LOG} no integration found for orgId=${orgId}`);
    return new Response("Integration not found", { status: 404 });
  }

  const settings = parseSettings<JiraSettings>(integration.settings);

  if (!settings?.webhookSecret || settings.webhookSecret !== secret) {
    console.error(`${LOG} invalid secret for orgId=${orgId}`);
    return new Response("Invalid secret", { status: 401 });
  }

  let payload: JiraWebhookPayload;
  try {
    payload = (await request.json()) as JiraWebhookPayload;
  } catch {
    console.error(`${LOG} invalid JSON body`);
    return new Response("Invalid JSON", { status: 400 });
  }

  const { webhookEvent, issue, changelog } = payload;

  console.log(`${LOG} event=${webhookEvent} issueId=${issue?.id ?? "none"} issueKey=${issue?.key ?? "none"} orgId=${orgId}`);

  if (!issue || !webhookEvent.startsWith("jira:issue_")) {
    console.log(`${LOG} ignored — not an issue event`);
    return new Response("OK", { status: 200 });
  }

  if (webhookEvent === "jira:issue_deleted") {
    console.log(`${LOG} deleting link for issue=${issue.id}`);
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

  if (webhookEvent === "jira:issue_updated" && changelog) {
    const hasStatusChange = changelog.items.some((i) => i.field === "status");
    const hasSummaryChange = changelog.items.some((i) => i.field === "summary");
    if (!hasStatusChange && !hasSummaryChange) {
      console.log(`${LOG} ignored — no status or summary change in changelog`);
      return new Response("OK", { status: 200 });
    }
    const statusItem = changelog.items.find((i) => i.field === "status");
    if (statusItem) {
      console.log(`${LOG} status change: "${statusItem.fromString}" → "${statusItem.toString}"`);
    }
  }

  const link = await db.query.postExternalLinks.findFirst({
    where: and(
      eq(postExternalLinks.externalId, issue.id),
      eq(postExternalLinks.provider, "jira"),
      eq(postExternalLinks.organizationId, orgId),
    ),
    columns: { id: true, postId: true },
  });

  if (!link) {
    console.log(`${LOG} no linked post for issue=${issue.id} (${issue.key}) orgId=${orgId} — skipping`);
    return new Response("OK", { status: 200 });
  }

  const newStatusName = issue.fields?.status?.name;
  const categoryKey = issue.fields?.status?.statusCategory?.key;
  const newSummary = issue.fields?.summary;
  const newStatus = newStatusName
    ? resolveStatus(newStatusName, categoryKey, settings.statusMappings)
    : null;

  console.log(
    `${LOG} syncing issue=${issue.id} → postId=${link.postId} status="${newStatusName ?? "unchanged"}" category="${categoryKey ?? "unknown"}" resolvedTo=${newStatus ?? "none"}`,
  );

  await db.transaction(async (tx) => {
    await tx
      .update(postExternalLinks)
      .set({
        ...(newStatusName ? { externalStatus: newStatusName } : {}),
        ...(newSummary ? { externalTitle: newSummary } : {}),
        lastSyncedAt: new Date(),
      })
      .where(eq(postExternalLinks.id, link.id));

    if (newStatus) {
      await tx
        .update(feedbackPosts)
        .set({ status: newStatus })
        .where(and(eq(feedbackPosts.id, link.postId), eq(feedbackPosts.organizationId, orgId)));
    }
  });

  console.log(`${LOG} done — issue=${issue.id} postId=${link.postId} newStatus=${newStatus ?? "none"}`);
  return new Response("OK", { status: 200 });
}
