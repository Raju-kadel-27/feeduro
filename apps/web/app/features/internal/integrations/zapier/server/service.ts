import type { WebhookPayload } from "@features/internal/webhooks/server/dispatch";

export async function deliverToZapierCatchHook(
  catchHookUrl: string,
  payload: WebhookPayload,
): Promise<void> {
  try {
    await fetch(catchHookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Fire-and-forget — delivery failures are intentionally swallowed.
  }
}
