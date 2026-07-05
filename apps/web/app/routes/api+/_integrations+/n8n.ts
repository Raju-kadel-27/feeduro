import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import { deliverToN8nWebhook } from "@features/internal/integrations/n8n/server/service";
import type { WebhookEvent } from "@features/internal/webhooks/server/dispatch";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { z } from "zod";
import { integrations, member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/n8n";

const SUPPORTED_EVENTS: WebhookEvent[] = [
  "feedback.created",
  "feedback.status_changed",
  "comment.created",
  "changelog.created",
  "changelog.published",
];

const bodySchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("save"),
    webhookUrl: z
      .string()
      .url("Must be a valid URL")
      .refine((u) => u.startsWith("https://"), "Must be an HTTPS URL"),
    events: z.array(z.string()).min(1, "Select at least one event"),
  }),
  z.object({ intent: z.literal("test") }),
  z.object({ intent: z.literal("disconnect") }),
]);

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);
  const integration = await db.query.integrations.findFirst({
    where: and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "n8n")),
    columns: { accessToken: true, settings: true },
  });
  return data({
    connected: !!integration?.accessToken,
    settings: integration?.settings ? JSON.parse(integration.settings) : null,
  });
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);

  await requirePermission(db, organizationId, session.user.id, { settings: ["update"] });

  const raw = await request.json();
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  if (parsed.data.intent === "save") {
    const { webhookUrl, events } = parsed.data;
    const validEvents = events.includes("*")
      ? (["*"] as string[])
      : events.filter((e) => (SUPPORTED_EVENTS as string[]).includes(e));
    if (validEvents.length === 0) {
      return data({ error: "No valid events selected" }, { status: 400 });
    }

    await db
      .insert(integrations)
      .values({
        organizationId,
        provider: "n8n",
        accessToken: webhookUrl,
        settings: JSON.stringify({ events: validEvents }),
        connectedByUserId: session.user.id,
      })
      .onConflictDoUpdate({
        target: [integrations.organizationId, integrations.provider],
        set: {
          accessToken: webhookUrl,
          settings: JSON.stringify({ events: validEvents }),
          updatedAt: new Date(),
        },
      });

    return data({ success: true });
  }

  if (parsed.data.intent === "test") {
    const integration = await db.query.integrations.findFirst({
      where: and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "n8n")),
      columns: { accessToken: true },
    });
    if (!integration?.accessToken) {
      return data({ error: "n8n not connected" }, { status: 400 });
    }

    await deliverToN8nWebhook(integration.accessToken, {
      event: "feedback.created",
      organizationId,
      data: {
        id: "test_post_id",
        title: "Test feedback post",
        description: "This is a test event from Feeduro",
        status: "open",
        boardId: "test_board_id",
      },
      timestamp: new Date().toISOString(),
    });

    return data({ success: true });
  }

  if (parsed.data.intent === "disconnect") {
    await db
      .delete(integrations)
      .where(
        and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "n8n")),
      );
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
