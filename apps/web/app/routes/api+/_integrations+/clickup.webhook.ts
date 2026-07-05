import { verifyClickupWebhookSignature } from "@features/internal/integrations/clickup/server/client";
import type { ClickupSettings } from "@features/internal/integrations/clickup/server/schemas";
import { parseSettings } from "@features/internal/integrations/server/queries";
import { and, eq } from "drizzle-orm";
import { feedbackPosts, integrations, postExternalLinks } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/clickup.webhook";

const LOG = "[clickup-webhook]";

type FeeduroStatus = "open" | "reviewing" | "planned" | "in-progress" | "completed" | "closed";

// Default mapping by ClickUp status type (used when no explicit mapping is configured).
const TYPE_DEFAULTS: Partial<Record<string, FeeduroStatus>> = {
  done: "completed",
  closed: "closed",
};

type ClickupWebhookPayload = {
  event: string;
  task_id?: string;
  webhook_id?: string;
  history_items?: Array<{
    field: string;
    before?: { status?: string; type?: string };
    after?: { status?: string; type?: string };
  }>;
};

function resolveStatus(
  statusName: string,
  statusType: string,
  mappings: ClickupSettings["statusMappings"],
): FeeduroStatus | null {
  const nameMatch = mappings?.find((m) => m.clickupStatus.toLowerCase() === statusName.toLowerCase());
  if (nameMatch) return nameMatch.feeduroStatus as FeeduroStatus;
  return TYPE_DEFAULTS[statusType] ?? null;
}

// POST /api/clickup/webhook?orgId=<feeduro-org-id>
export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");
  if (!orgId) {
    console.error(`${LOG} rejected: missing orgId`);
    return new Response("Missing orgId", { status: 400 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-signature") ?? "";

  const integration = await db.query.integrations.findFirst({
    where: and(eq(integrations.organizationId, orgId), eq(integrations.provider, "clickup")),
    columns: { settings: true },
  });
  if (!integration) return new Response("Integration not found", { status: 404 });

  const settings = parseSettings<ClickupSettings>(integration.settings);

  if (settings?.webhookSecret) {
    const valid = await verifyClickupWebhookSignature(rawBody, signature, settings.webhookSecret);
    if (!valid) {
      console.error(`${LOG} invalid signature orgId=${orgId}`);
      return new Response("Invalid signature", { status: 401 });
    }
  }

  let payload: ClickupWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as ClickupWebhookPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (payload.event !== "taskStatusUpdated" || !payload.task_id) {
    return new Response("OK", { status: 200 });
  }

  const statusItem = payload.history_items?.find((h) => h.field === "status");
  const after = statusItem?.after;
  if (!after?.status) return new Response("OK", { status: 200 });

  console.log(`${LOG} taskStatusUpdated taskId=${payload.task_id} status="${after.status}" type="${after.type}" orgId=${orgId}`);

  const link = await db.query.postExternalLinks.findFirst({
    where: and(
      eq(postExternalLinks.externalId, payload.task_id),
      eq(postExternalLinks.provider, "clickup"),
      eq(postExternalLinks.organizationId, orgId),
    ),
    columns: { id: true, postId: true },
  });
  if (!link) {
    console.log(`${LOG} no linked post for taskId=${payload.task_id} — skipping`);
    return new Response("OK", { status: 200 });
  }

  const newStatus = resolveStatus(after.status, after.type ?? "", settings?.statusMappings);
  console.log(`${LOG} syncing taskId=${payload.task_id} → postId=${link.postId} feeduroStatus=${newStatus ?? "none"}`);

  await db.transaction(async (tx) => {
    await tx
      .update(postExternalLinks)
      .set({ externalStatus: after.status, lastSyncedAt: new Date() })
      .where(eq(postExternalLinks.id, link.id));

    if (newStatus) {
      await tx
        .update(feedbackPosts)
        .set({ status: newStatus })
        .where(and(eq(feedbackPosts.id, link.postId), eq(feedbackPosts.organizationId, orgId)));
    }
  });

  console.log(`${LOG} done taskId=${payload.task_id} postId=${link.postId}`);
  return new Response("OK", { status: 200 });
}
