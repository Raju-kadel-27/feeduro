import { verifyLinearWebhookSignature } from "@features/internal/integrations/linear/server/client";
import type { LinearSettings } from "@features/internal/integrations/linear/server/schemas";
import { parseSettings } from "@features/internal/integrations/server/queries";
import { and, eq } from "drizzle-orm";
import { getDb, withTransaction } from "@/db";
import { feedbackPosts, integrations, postExternalLinks } from "@/db/schema";
import type { Route } from "./+types/linear.webhook";

const LOG = "[linear-webhook]";

type FeeduroStatus = "open" | "reviewing" | "planned" | "in-progress" | "completed" | "closed";

type LinearStateType =
  | "triage"
  | "backlog"
  | "unstarted"
  | "started"
  | "completed"
  | "cancelled";

type LinearWebhookPayload = {
  action: "create" | "update" | "remove";
  type: string;
  data: {
    id: string;
    title?: string;
    state?: {
      id: string;
      name: string;
      type: LinearStateType;
    };
  };
};

// Default mapping by Linear state type — used when no statusMappings are configured.
const STATE_TYPE_TO_FEEDURO: Partial<Record<LinearStateType, FeeduroStatus>> = {
  completed: "completed",
  cancelled: "closed",
  started: "in-progress",
};

function resolveStatus(
  stateName: string,
  stateType: LinearStateType,
  mappings: LinearSettings["statusMappings"],
): FeeduroStatus | null {
  // User-configured name match takes priority
  const nameMatch = mappings?.find((m) => m.linearStateName === stateName);
  if (nameMatch?.feeduroStatus) return nameMatch.feeduroStatus as FeeduroStatus;

  // Fall back to type-based defaults
  return STATE_TYPE_TO_FEEDURO[stateType] ?? null;
}

// POST /api/linear/webhook?orgId=<feeduro-org-id>
export async function action({ request }: Route.ActionArgs) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");

  if (!orgId) {
    console.error(`${LOG} rejected: missing orgId`);
    return new Response("Missing orgId", { status: 400 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("Linear-Signature") ?? "";
  const db = getDb();

  const integration = await db.query.integrations.findFirst({
    where: and(eq(integrations.organizationId, orgId), eq(integrations.provider, "linear")),
    columns: { settings: true },
  });

  if (!integration) {
    console.error(`${LOG} no integration found for orgId=${orgId}`);
    return new Response("Integration not found", { status: 404 });
  }

  const settings = parseSettings<LinearSettings>(integration.settings);

  if (!settings?.webhookSecret) {
    console.error(`${LOG} no webhookSecret for orgId=${orgId}`);
    return new Response("Webhook not configured", { status: 400 });
  }

  const valid = await verifyLinearWebhookSignature(rawBody, signature, settings.webhookSecret);
  if (!valid) {
    console.error(`${LOG} invalid signature for orgId=${orgId}`);
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: LinearWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LinearWebhookPayload;
  } catch {
    console.error(`${LOG} invalid JSON body`);
    return new Response("Invalid JSON", { status: 400 });
  }

  if (payload.type !== "Issue" || payload.action !== "update" || !payload.data.state) {
    return new Response("OK", { status: 200 });
  }

  const { id: linearIssueId, title: newTitle, state } = payload.data;

  console.log(
    `${LOG} issue=${linearIssueId} state="${state.name}" type="${state.type}" orgId=${orgId}`,
  );

  const link = await db.query.postExternalLinks.findFirst({
    where: and(
      eq(postExternalLinks.externalId, linearIssueId),
      eq(postExternalLinks.provider, "linear"),
      eq(postExternalLinks.organizationId, orgId),
    ),
    columns: { id: true, postId: true },
  });

  if (!link) {
    console.log(`${LOG} no linked post for issue=${linearIssueId} — skipping`);
    return new Response("OK", { status: 200 });
  }

  const newStatus = resolveStatus(state.name, state.type, settings.statusMappings);

  console.log(
    `${LOG} syncing issue=${linearIssueId} → postId=${link.postId} newStatus=${newStatus ?? "none"}`,
  );

  await withTransaction(async (tx) => {
    await tx
      .update(postExternalLinks)
      .set({
        externalStatus: state.name,
        ...(newTitle ? { externalTitle: newTitle } : {}),
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

  console.log(`${LOG} done — issue=${linearIssueId} postId=${link.postId}`);
  return new Response("OK", { status: 200 });
}
