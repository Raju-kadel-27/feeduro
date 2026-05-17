import { verifyLinearWebhookSignature } from "@features/integrations/linear/server/client";
import { parseSettings } from "@features/integrations/server/queries";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackPosts, integrations, postExternalLinks } from "@/db/schema";

import type { LinearSettings } from "@features/integrations/linear/server/schemas";
import type { Route } from "./+types/linear.webhook";

type LinearWebhookPayload = {
  action: "create" | "update" | "remove";
  type: string;
  organizationId: string; // Linear workspace ID
  data: {
    id: string;
    identifier?: string;
    title?: string;
    state?: {
      id: string;
      name: string;
      type: string;
    };
  };
};

// POST /api/linear/webhook?orgId=<feediyo-org-id>
// Called by Linear when an issue is created/updated in the connected workspace.
export async function action({ request }: Route.ActionArgs) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");

  if (!orgId) {
    return new Response("Missing orgId", { status: 400 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("Linear-Signature") ?? "";

  const db = getDb();

  // Load the integration to get the webhook secret for signature verification
  const integration = await db.query.integrations.findFirst({
    where: and(eq(integrations.organizationId, orgId), eq(integrations.provider, "linear")),
  });

  if (!integration) {
    return new Response("Integration not found", { status: 404 });
  }

  const settings = parseSettings<LinearSettings>(integration.settings);

  if (!settings?.webhookSecret) {
    return new Response("Webhook not configured", { status: 400 });
  }

  const valid = await verifyLinearWebhookSignature(rawBody, signature, settings.webhookSecret);
  if (!valid) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: LinearWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LinearWebhookPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Only process issue updates — ignore creates, deletes, and other resource types
  if (payload.type !== "Issue" || payload.action !== "update" || !payload.data.state) {
    return new Response("OK", { status: 200 });
  }

  const linearIssueId = payload.data.id;
  const newStateName = payload.data.state.name;
  const newTitle = payload.data.title;

  // Find the linked post
  const link = await db.query.postExternalLinks.findFirst({
    where: and(
      eq(postExternalLinks.externalId, linearIssueId),
      eq(postExternalLinks.provider, "linear"),
      eq(postExternalLinks.organizationId, orgId),
    ),
  });

  if (!link) {
    return new Response("OK", { status: 200 });
  }

  // Update cached status and title on the link
  await db
    .update(postExternalLinks)
    .set({
      externalStatus: newStateName,
      ...(newTitle ? { externalTitle: newTitle } : {}),
      lastSyncedAt: new Date(),
    })
    .where(eq(postExternalLinks.id, link.id));

  // Apply status mapping to update the Feediyo post status
  const mappings = settings.statusMappings ?? [];
  const match = mappings.find((m) => m.linearStateName === newStateName);

  if (match?.feediyoStatus) {
    await db
      .update(feedbackPosts)
      .set({ status: match.feediyoStatus as typeof feedbackPosts.$inferSelect.status })
      .where(and(eq(feedbackPosts.id, link.postId), eq(feedbackPosts.organizationId, orgId)));
  }

  return new Response("OK", { status: 200 });
}
