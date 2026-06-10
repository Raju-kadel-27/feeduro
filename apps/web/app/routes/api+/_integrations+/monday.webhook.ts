import type { MondaySettings } from "@features/integrations/monday/server/schemas";
import { getIntegration, parseSettings } from "@features/integrations/server/queries";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackPosts, postExternalLinks } from "@/db/schema";
import type { Route } from "./+types/monday.webhook";

const LOG = "[monday-webhook]";

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

// POST /api/monday/webhook?orgId=<feeduro-org-id>&secret=<webhook-secret>
// Handles Monday.com challenge verification and incoming events.
export async function action({ request }: Route.ActionArgs) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");
  const secret = url.searchParams.get("secret");

  const body = await request.text();
  console.log(`${LOG} received orgId=${orgId ?? "missing"} bodyLen=${body.length}`);

  let payload: MondayWebhookPayload;
  try {
    payload = JSON.parse(body) as MondayWebhookPayload;
  } catch {
    console.error(`${LOG} invalid JSON body`);
    return new Response("Invalid JSON", { status: 400 });
  }

  // Monday.com challenge handshake — respond immediately, no auth needed
  if (payload.challenge) {
    console.log(`${LOG} challenge handshake — responding`);
    return new Response(JSON.stringify({ challenge: payload.challenge }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!orgId) {
    console.error(`${LOG} missing orgId in URL`);
    return new Response("Missing orgId", { status: 400 });
  }

  const db = getDb();
  const integration = await getIntegration(orgId, "monday");
  if (!integration) {
    console.error(`${LOG} integration not found orgId=${orgId}`);
    return new Response("Integration not found", { status: 404 });
  }

  const settings = parseSettings<MondaySettings>(integration.settings);

  // Verify URL secret matches stored secret
  if (settings?.webhookSecret && settings.webhookSecret !== secret) {
    console.error(`${LOG} secret mismatch orgId=${orgId}`);
    return new Response("Invalid secret", { status: 401 });
  }

  if (payload.event) {
    console.log(`${LOG} event type=${payload.event.type} pulseId=${payload.event.pulseId} boardId=${payload.event.boardId}`);
    await processEvent(db, orgId, settings, payload.event);
  } else {
    console.warn(`${LOG} payload has no event field orgId=${orgId}`);
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
    console.log(`${LOG} delete_pulse itemId=${itemId} orgId=${orgId}`);
    await db
      .delete(postExternalLinks)
      .where(
        and(
          eq(postExternalLinks.externalId, itemId),
          eq(postExternalLinks.provider, "monday"),
          eq(postExternalLinks.organizationId, orgId),
        ),
      );
    console.log(`${LOG} delete_pulse done itemId=${itemId}`);
    return;
  }

  if (event.type === "update_column_value") {
    const labelText = event.value?.label?.text;
    console.log(`${LOG} update_column_value itemId=${itemId} columnId=${event.columnId} columnType=${event.columnType} label="${labelText ?? "none"}"`);

    const link = await db.query.postExternalLinks.findFirst({
      where: and(
        eq(postExternalLinks.externalId, itemId),
        eq(postExternalLinks.provider, "monday"),
        eq(postExternalLinks.organizationId, orgId),
      ),
      columns: { id: true, postId: true },
    });
    if (!link) {
      console.warn(`${LOG} no linked post found for itemId=${itemId} orgId=${orgId} — skipping`);
      return;
    }

    if (!labelText) {
      console.warn(`${LOG} event has no label text itemId=${itemId} — skipping`);
      return;
    }

    await db
      .update(postExternalLinks)
      .set({ externalStatus: labelText, lastSyncedAt: new Date() })
      .where(eq(postExternalLinks.id, link.id));

    // Apply status mapping
    const mappings = settings?.statusMappings ?? [];
    const match = mappings.find((m) => m.groupTitle.toLowerCase() === labelText.toLowerCase());
    if (match?.feeduroStatus) {
      console.log(`${LOG} mapping matched label="${labelText}" → feeduroStatus="${match.feeduroStatus}" postId=${link.postId}`);
      await db
        .update(feedbackPosts)
        .set({ status: match.feeduroStatus as typeof feedbackPosts.$inferSelect.status })
        .where(and(eq(feedbackPosts.id, link.postId), eq(feedbackPosts.organizationId, orgId)));
      console.log(`${LOG} post status updated postId=${link.postId} status="${match.feeduroStatus}"`);
    } else {
      console.warn(`${LOG} no mapping for label="${labelText}" — external status updated but feeduro status unchanged (mappings=${mappings.length})`);
    }
    return;
  }

  console.warn(`${LOG} unhandled event type="${event.type}" itemId=${itemId}`);
}
