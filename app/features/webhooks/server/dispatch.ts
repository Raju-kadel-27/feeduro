import { hmacHex } from "@lib/crypto";
import { waitUntil } from "@middleware/cloudflare.server";
import { and, eq } from "drizzle-orm";
import type { RouterContextProvider } from "react-router";
import { deliverToN8nWebhook } from "@features/integrations/n8n/server/service";
import { deliverToZapierCatchHook } from "@features/integrations/zapier/server/service";
import { getDb } from "@/db";
import { integrations, webhookEndpoints } from "@/db/schema";

export type WebhookEvent =
  | "feedback.created"
  | "feedback.status_changed"
  | "comment.created"
  | "changelog.created"
  | "changelog.published";

export interface WebhookPayload {
  event: WebhookEvent;
  organizationId: string;
  data: Record<string, unknown>;
  timestamp: string;
}


async function deliverToEndpoint(url: string, secret: string, payload: WebhookPayload) {
  const body = JSON.stringify(payload);
  const signature = await hmacHex(body, secret);

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Event": payload.event,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Fire-and-forget — delivery failures are intentionally swallowed.
  }
}

async function deliverWebhookBackground(
  organizationId: string,
  event: WebhookEvent,
  eventData: Record<string, unknown>,
) {
  const db = getDb();

  const [endpoints, zapierIntegration, n8nIntegration] = await Promise.all([
    db.query.webhookEndpoints.findMany({
      where: eq(webhookEndpoints.organizationId, organizationId),
    }),
    db.query.integrations.findFirst({
      where: and(
        eq(integrations.organizationId, organizationId),
        eq(integrations.provider, "zapier"),
        eq(integrations.enabled, true),
      ),
      columns: { accessToken: true, settings: true },
    }),
    db.query.integrations.findFirst({
      where: and(
        eq(integrations.organizationId, organizationId),
        eq(integrations.provider, "n8n"),
        eq(integrations.enabled, true),
      ),
      columns: { accessToken: true, settings: true },
    }),
  ]);

  const payload: WebhookPayload = {
    event,
    organizationId,
    data: eventData,
    timestamp: new Date().toISOString(),
  };

  const deliveries: Promise<void>[] = [];

  for (const ep of endpoints) {
    if (!ep.isActive) continue;
    const events: string[] = JSON.parse(ep.events);
    if (events.includes("*") || events.includes(event)) {
      deliveries.push(deliverToEndpoint(ep.url, ep.secret, payload));
    }
  }

  if (zapierIntegration?.accessToken) {
    const settings = zapierIntegration.settings
      ? (JSON.parse(zapierIntegration.settings) as { events?: string[] })
      : null;
    const zapierEvents = settings?.events ?? ["*"];
    if (zapierEvents.includes("*") || zapierEvents.includes(event)) {
      deliveries.push(deliverToZapierCatchHook(zapierIntegration.accessToken, payload));
    }
  }

  if (n8nIntegration?.accessToken) {
    const settings = n8nIntegration.settings
      ? (JSON.parse(n8nIntegration.settings) as { events?: string[] })
      : null;
    const n8nEvents = settings?.events ?? ["*"];
    if (n8nEvents.includes("*") || n8nEvents.includes(event)) {
      deliveries.push(deliverToN8nWebhook(n8nIntegration.accessToken, payload));
    }
  }

  if (deliveries.length === 0) return;

  await Promise.allSettled(deliveries);
}

export function dispatchWebhook(
  context: Readonly<RouterContextProvider>,
  organizationId: string,
  event: WebhookEvent,
  eventData: Record<string, unknown>,
) {
  waitUntil(context, deliverWebhookBackground(organizationId, event, eventData));
}
