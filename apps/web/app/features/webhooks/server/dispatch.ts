import { deliverToN8nWebhook } from "@features/integrations/n8n/server/service";
import { deliverToZapierCatchHook } from "@features/integrations/zapier/server/service";
import { hmacHex } from "@lib/crypto";
import { waitUntil } from "@middleware/cloudflare.server";
import { and, eq } from "drizzle-orm";
import type { RouterContextProvider } from "react-router";
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

async function deliverToEndpoint(
  url: string,
  secret: string,
  payload: WebhookPayload,
): Promise<number | null> {
  const body = JSON.stringify(payload);
  const signature = await hmacHex(body, secret);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Event": payload.event,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    return res.status;
  } catch {
    return null;
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
      where: and(
        eq(webhookEndpoints.organizationId, organizationId),
        eq(webhookEndpoints.isActive, true),
      ),
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

  const endpointDeliveries: Array<{ id: string; promise: Promise<number | null> }> = [];
  const sideDeliveries: Promise<void>[] = [];

  for (const ep of endpoints) {
    let events: string[];
    try {
      events = JSON.parse(ep.events);
    } catch {
      console.error(`[webhooks] invalid events JSON for endpoint ${ep.id}`);
      continue;
    }
    if (events.includes("*") || events.includes(event)) {
      endpointDeliveries.push({ id: ep.id, promise: deliverToEndpoint(ep.url, ep.secret, payload) });
    }
  }

  if (zapierIntegration?.accessToken) {
    const settings = zapierIntegration.settings
      ? (JSON.parse(zapierIntegration.settings) as { events?: string[] })
      : null;
    const zapierEvents = settings?.events ?? ["*"];
    if (zapierEvents.includes("*") || zapierEvents.includes(event)) {
      sideDeliveries.push(deliverToZapierCatchHook(zapierIntegration.accessToken, payload));
    }
  }

  if (n8nIntegration?.accessToken) {
    const settings = n8nIntegration.settings
      ? (JSON.parse(n8nIntegration.settings) as { events?: string[] })
      : null;
    const n8nEvents = settings?.events ?? ["*"];
    if (n8nEvents.includes("*") || n8nEvents.includes(event)) {
      sideDeliveries.push(deliverToN8nWebhook(n8nIntegration.accessToken, payload));
    }
  }

  if (endpointDeliveries.length === 0 && sideDeliveries.length === 0) return;

  const [epResults] = await Promise.all([
    Promise.allSettled(endpointDeliveries.map((d) => d.promise)),
    Promise.allSettled(sideDeliveries),
  ]);

  if (endpointDeliveries.length > 0) {
    const now = new Date();
    await Promise.all(
      epResults.map((result, i) => {
        const statusCode = result.status === "fulfilled" ? result.value : null;
        return db
          .update(webhookEndpoints)
          .set({ lastDeliveryAt: now, lastDeliveryStatus: statusCode })
          .where(eq(webhookEndpoints.id, endpointDeliveries[i].id));
      }),
    );
  }
}

export function dispatchWebhook(
  context: Readonly<RouterContextProvider>,
  organizationId: string,
  event: WebhookEvent,
  eventData: Record<string, unknown>,
) {
  waitUntil(context, deliverWebhookBackground(organizationId, event, eventData));
}
