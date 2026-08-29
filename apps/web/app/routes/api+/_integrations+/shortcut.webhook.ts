import { parseSettings } from "@features/internal/integrations/server/queries";
import { verifyShortcutWebhookSignature } from "@features/internal/integrations/shortcut/server/client";
import type { ShortcutSettings } from "@features/internal/integrations/shortcut/server/schemas";
import { and, eq } from "drizzle-orm";
import { feedbackPosts, integrations, postExternalLinks } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/shortcut.webhook";

type ShortcutWebhookPayload = {
  actions?: Array<{
    action: "create" | "update" | "delete";
    entity_type: string;
    id: number;
    name?: string;
    changes?: {
      workflow_state_id?: { new: number; old: number };
      name?: { new: string; old: string };
    };
  }>;
  references?: Array<{
    entity_type: string;
    id: number;
    name?: string;
    type?: string;
  }>;
};

// POST /api/shortcut/webhook?orgId=<feeduro-org-id>
export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");

  console.log("[shortcut-webhook] received", {
    orgId,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
  });

  if (!orgId) return new Response("Missing orgId", { status: 400 });

  const rawBody = await request.text();
  const signature = request.headers.get("Shortcut-Signature") ?? "";

  console.log("[shortcut-webhook] body", rawBody.slice(0, 500));
  console.log("[shortcut-webhook] signature header", signature);

  const integration = await db.query.integrations.findFirst({
    where: and(eq(integrations.organizationId, orgId), eq(integrations.provider, "shortcut")),
  });

  if (!integration) {
    console.log("[shortcut-webhook] integration not found for orgId", orgId);
    return new Response("Integration not found", { status: 404 });
  }

  const settings = parseSettings<ShortcutSettings>(integration.settings);
  console.log("[shortcut-webhook] settings", {
    hasWebhookSecret: !!settings?.webhookSecret,
    webhookId: settings?.webhookId,
    statusMappings: settings?.statusMappings?.length ?? 0,
  });

  if (settings?.webhookSecret) {
    const valid = await verifyShortcutWebhookSignature(rawBody, signature, settings.webhookSecret);
    console.log("[shortcut-webhook] signature valid:", valid);
    if (!valid) return new Response("Invalid signature", { status: 401 });
  }

  let payload: ShortcutWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as ShortcutWebhookPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const storyActions = (payload.actions ?? []).filter(
    (a) => a.entity_type === "story" && a.action === "update",
  );

  if (storyActions.length === 0) return new Response("OK", { status: 200 });

  const stateRefs = new Map<number, string>(
    (payload.references ?? [])
      .filter((r) => r.entity_type === "workflow-state")
      .map((r) => [r.id as number, r.name ?? ""] as [number, string]),
  );

  for (const action of storyActions) {
    const storyId = String(action.id);
    const newStateId = action.changes?.workflow_state_id?.new;
    const newTitle = action.changes?.name?.new;
    const newStateName = newStateId !== undefined ? (stateRefs.get(newStateId) ?? null) : null;

    const link = await db.query.postExternalLinks.findFirst({
      where: and(
        eq(postExternalLinks.externalId, storyId),
        eq(postExternalLinks.provider, "shortcut"),
        eq(postExternalLinks.organizationId, orgId),
      ),
      columns: { id: true, postId: true },
    });

    if (!link) continue;

    await db
      .update(postExternalLinks)
      .set({
        ...(newStateName ? { externalStatus: newStateName } : {}),
        ...(newTitle ? { externalTitle: newTitle } : {}),
        lastSyncedAt: new Date(),
      })
      .where(eq(postExternalLinks.id, link.id));

    if (newStateName) {
      const mappings = settings?.statusMappings ?? [];
      const match = mappings.find((m) => m.workflowStateName === newStateName);
      if (match?.feeduroStatus) {
        await db
          .update(feedbackPosts)
          .set({ status: match.feeduroStatus as typeof feedbackPosts.$inferSelect.status })
          .where(and(eq(feedbackPosts.id, link.postId), eq(feedbackPosts.organizationId, orgId)));
      }
    }
  }

  return new Response("OK", { status: 200 });
}
