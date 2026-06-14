import { getAsanaTaskByGid } from "@features/internal/integrations/asana/server/client";
import type { AsanaSettings } from "@features/internal/integrations/asana/server/schemas";
import { getIntegration, parseSettings } from "@features/internal/integrations/server/queries";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackPosts, integrations, postExternalLinks } from "@/db/schema";
import type { Route } from "./+types/asana.webhook";

type AsanaEvent = {
  action: string;
  resource: { gid: string; resource_type: string };
  parent?: { gid: string; resource_type: string };
  change?: {
    field: string;
    action: string;
    new_value?: unknown;
    added_value?: { gid: string; resource_type: string; name?: string } | boolean | null;
  };
};

// POST /api/asana/webhook?orgId=<feeduro-org-id>
// Handles both the initial handshake (X-Hook-Secret) and ongoing events (X-Hook-Signature).
export async function action({ request }: Route.ActionArgs) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");

  // Asana handshake: echo back X-Hook-Secret to complete webhook registration.
  // Also stores the secret so we can verify future HMAC signatures.
  const hookSecret = request.headers.get("X-Hook-Secret");
  if (hookSecret) {
    if (orgId) {
      const db = getDb();
      const integration = await getIntegration(orgId, "asana");
      if (integration) {
        const settings =
          parseSettings<AsanaSettings>(integration.settings) ?? ({} as AsanaSettings);
        await db
          .update(integrations)
          .set({
            settings: JSON.stringify({ ...settings, webhookSecret: hookSecret }),
            updatedAt: new Date(),
          })
          .where(and(eq(integrations.organizationId, orgId), eq(integrations.provider, "asana")));
      }
    }
    return new Response(null, {
      status: 200,
      headers: { "X-Hook-Secret": hookSecret },
    });
  }

  if (!orgId) return new Response("Missing orgId", { status: 400 });

  const db = getDb();
  const integration = await getIntegration(orgId, "asana");
  if (!integration) return new Response("Integration not found", { status: 404 });

  const settings = parseSettings<AsanaSettings>(integration.settings);

  // Verify HMAC-SHA256 signature
  const signature = request.headers.get("X-Hook-Signature");
  if (settings?.webhookSecret && signature) {
    const body = await request.text();
    const verified = await verifyHmac(settings.webhookSecret, body, signature);
    if (!verified) return new Response("Invalid signature", { status: 401 });

    await processEvents(db, orgId, integration.accessToken!, settings, body);
  } else {
    // No secret yet (handshake pending) or no signature — still process but don't verify
    const body = await request.text();
    if (integration.accessToken) {
      await processEvents(db, orgId, integration.accessToken, settings, body);
    }
  }

  return new Response("OK", { status: 200 });
}

async function verifyHmac(secret: string, body: string, signature: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return signature === hex || signature === `sha256=${hex}`;
  } catch {
    return false;
  }
}

async function processEvents(
  db: ReturnType<typeof getDb>,
  orgId: string,
  accessToken: string,
  settings: AsanaSettings | null,
  body: string,
): Promise<void> {
  let payload: { events?: AsanaEvent[] };
  try {
    payload = JSON.parse(body) as { events?: AsanaEvent[] };
  } catch {
    return;
  }

  const events = payload.events ?? [];

  for (const event of events) {
    if (event.resource.resource_type !== "task") continue;
    if (event.action !== "changed" && event.action !== "removed") continue;

    const taskGid = event.resource.gid;

    if (event.action === "removed") {
      // Task deleted — remove the link
      await db
        .delete(postExternalLinks)
        .where(
          and(
            eq(postExternalLinks.externalId, taskGid),
            eq(postExternalLinks.provider, "asana"),
            eq(postExternalLinks.organizationId, orgId),
          ),
        );
      continue;
    }

    if (event.action === "changed") {
      const field = event.change?.field;
      if (field !== "completed" && field !== "section") continue;

      const link = await db.query.postExternalLinks.findFirst({
        where: and(
          eq(postExternalLinks.externalId, taskGid),
          eq(postExternalLinks.provider, "asana"),
          eq(postExternalLinks.organizationId, orgId),
        ),
      });
      if (!link) continue;

      // Fetch current task state from Asana to get accurate section + completion info
      let newStatus: string | null = null;
      let newSectionGid: string | null = null;
      try {
        const workspaceGid = settings?.workspaceGid ?? "";
        const task = await getAsanaTaskByGid(accessToken, workspaceGid, taskGid);
        newStatus = task.completed ? "Completed" : (task.sectionName ?? null);
        newSectionGid = task.sectionGid;

        await db
          .update(postExternalLinks)
          .set({
            externalTitle: task.name,
            externalStatus: newStatus ?? link.externalStatus,
            lastSyncedAt: new Date(),
          })
          .where(eq(postExternalLinks.id, link.id));
      } catch {
        // If task fetch fails, fall back to change info from event
        if (field === "completed") {
          const val = event.change?.new_value ?? event.change?.added_value;
          const completed = val === true || val === "true";
          newStatus = completed ? "Completed" : null;
        }
        if (
          field === "section" &&
          event.change?.added_value &&
          typeof event.change.added_value === "object" &&
          "gid" in event.change.added_value
        ) {
          newSectionGid = (event.change.added_value as { gid: string }).gid;
        }
      }

      // Apply status mapping to update Feeduro post status
      const mappings = settings?.statusMappings ?? [];
      let feeduroStatus: string | null = null;

      if (newStatus === "Completed") {
        const completedMap = mappings.find((m) => m.sectionGid === "__completed__");
        if (completedMap?.feeduroStatus) feeduroStatus = completedMap.feeduroStatus;
      } else if (newSectionGid) {
        const match = mappings.find((m) => m.sectionGid === newSectionGid);
        if (match?.feeduroStatus) feeduroStatus = match.feeduroStatus;
      }

      if (feeduroStatus) {
        await db
          .update(feedbackPosts)
          .set({ status: feeduroStatus as typeof feedbackPosts.$inferSelect.status })
          .where(and(eq(feedbackPosts.id, link.postId), eq(feedbackPosts.organizationId, orgId)));
      }
    }
  }
}
