import { getIntegration, parseSettings } from "@features/integrations/server/queries";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackPosts, postExternalLinks } from "@/db/schema";

import type { MondaySettings } from "@features/integrations/monday/server/schemas";
import type { Route } from "./+types/monday.webhook";

type MondayEvent =
  | {
      type: "update_column_value";
      boardId: number;
      pulseId: number;
      columnId: string;
      columnType: string;
      value: {
        label?: { text: string; is_done?: boolean };
      };
    }
  | {
      type: "delete_pulse";
      boardId: number;
      pulseId: number;
    };

type MondayWebhookPayload = {
  challenge?: string;
  event?: MondayEvent;
};

// POST /api/monday/webhook?orgId=<feediyo-org-id>&secret=<webhook-secret>
// Handles Monday.com challenge verification and incoming events.
export async function action({ request }: Route.ActionArgs) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");
  const secret = url.searchParams.get("secret");

  const body = await request.text();
  let payload: MondayWebhookPayload;
  try {
    payload = JSON.parse(body) as MondayWebhookPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Monday.com challenge handshake — respond immediately, no auth needed
  if (payload.challenge) {
    return new Response(JSON.stringify({ challenge: payload.challenge }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!orgId) return new Response("Missing orgId", { status: 400 });

  const db = getDb();
  const integration = await getIntegration(orgId, "monday");
  if (!integration) return new Response("Integration not found", { status: 404 });

  const settings = parseSettings<MondaySettings>(integration.settings);

  // Verify URL secret matches stored secret
  if (settings?.webhookSecret && settings.webhookSecret !== secret) {
    return new Response("Invalid secret", { status: 401 });
  }

  if (payload.event) {
    await processEvent(db, orgId, settings, payload.event);
  }

  return new Response("OK", { status: 200 });
}

async function processEvent(
  db: ReturnType<typeof getDb>,
  orgId: string,
  settings: MondaySettings | null,
  event: MondayEvent,
): Promise<void> {
  const itemId = String(event.pulseId);

  if (event.type === "delete_pulse") {
    await db
      .delete(postExternalLinks)
      .where(
        and(
          eq(postExternalLinks.externalId, itemId),
          eq(postExternalLinks.provider, "monday"),
          eq(postExternalLinks.organizationId, orgId),
        ),
      );
    return;
  }

  if (event.type === "update_column_value") {
    const link = await db.query.postExternalLinks.findFirst({
      where: and(
        eq(postExternalLinks.externalId, itemId),
        eq(postExternalLinks.provider, "monday"),
        eq(postExternalLinks.organizationId, orgId),
      ),
      columns: { id: true, postId: true },
    });
    if (!link) return;

    const labelText = event.value?.label?.text;
    if (!labelText) return;

    await db
      .update(postExternalLinks)
      .set({ externalStatus: labelText, lastSyncedAt: new Date() })
      .where(eq(postExternalLinks.id, link.id));

    // Apply status mapping
    const mappings = settings?.statusMappings ?? [];
    const match = mappings.find(
      (m) => m.groupTitle.toLowerCase() === labelText.toLowerCase(),
    );
    if (match?.feediyoStatus) {
      await db
        .update(feedbackPosts)
        .set({ status: match.feediyoStatus as typeof feedbackPosts.$inferSelect.status })
        .where(
          and(eq(feedbackPosts.id, link.postId), eq(feedbackPosts.organizationId, orgId)),
        );
    }
  }
}
