import type { WebhookPayload } from "@features/webhooks/server/dispatch";

export async function deliverToN8nWebhook(
  webhookUrl: string,
  payload: WebhookPayload,
): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Fire-and-forget — delivery failures are intentionally swallowed.
  }
}
