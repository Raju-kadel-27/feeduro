import type { WebhookPayload } from "@features/internal/webhooks/server/dispatch";

const COLORS = {
  "feedback.created": 0x5865f2,
  "feedback.status_changed": 0xf59e0b,
  "comment.created": 0x10b981,
  "changelog.created": 0x6366f1,
  "changelog.published": 0x059669,
} as const;

function buildEmbed(payload: WebhookPayload) {
  const { event, data, timestamp } = payload;
  const color = COLORS[event];

  switch (event) {
    case "feedback.created":
      return {
        title: `New feedback: ${String(data.title)}`,
        color,
        fields: [{ name: "Status", value: String(data.status), inline: true }],
        timestamp,
      };
    case "feedback.status_changed":
      return {
        title: "Feedback status changed",
        color,
        fields: [
          { name: "From", value: String(data.oldStatus), inline: true },
          { name: "To", value: String(data.newStatus), inline: true },
        ],
        timestamp,
      };
    case "comment.created":
      return {
        title: "New comment",
        description: String(data.body).slice(0, 300),
        color,
        timestamp,
      };
    case "changelog.created":
      return { title: "Changelog entry drafted", color, timestamp };
    case "changelog.published":
      return { title: "Changelog published", color, timestamp };
  }
}

export async function deliverToDiscord(
  webhookUrl: string,
  payload: WebhookPayload,
): Promise<void> {
  const embed = buildEmbed(payload);
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
    signal: AbortSignal.timeout(10_000),
  });
}
