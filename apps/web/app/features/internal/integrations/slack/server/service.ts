import type { WebhookPayload } from "@features/internal/webhooks/server/dispatch";

function buildBlocks(payload: WebhookPayload) {
  const { event, data, timestamp } = payload;
  const date = new Date(timestamp).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  const headerText = {
    "feedback.created": `*New feedback submitted*\n${String(data.title)}`,
    "feedback.status_changed": `*Feedback status changed*\n${String(data.oldStatus)} → ${String(data.newStatus)}`,
    "comment.created": `*New comment*\n${String(data.body).slice(0, 300)}`,
    "changelog.created": "*Changelog entry drafted*",
    "changelog.published": "*Changelog published*",
  }[event];

  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: headerText },
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: date }],
    },
  ];
}

export async function deliverToSlack(
  webhookUrl: string,
  payload: WebhookPayload,
): Promise<void> {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks: buildBlocks(payload) }),
    signal: AbortSignal.timeout(10_000),
  });
}
