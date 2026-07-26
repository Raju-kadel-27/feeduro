import { requireOrganization } from "@features/auth/server/guards";
import { isAdmin } from "@features/internal/roles/server/queries";
import { SUPPORTED_EVENTS } from "@feeduro/data-access/webhooks/constants";
import { getWebhookSecret, listWebhooks } from "@feeduro/data-access/webhooks/queries";
import { CreateWebhookSchema, createWebhook, deleteWebhook, rotateWebhookSecret, UpdateWebhookSchema, updateWebhook } from "@feeduro/data-access/webhooks/webhooks";
import { data } from "react-router";
import { z } from "zod";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/webhooks";

const IntentSchema = z.object({
  intent: z.enum(["create", "update", "rotate_secret", "delete", "reveal_secret"]),
});
const IdSchema = z.object({ id: z.string().min(1) });

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);
  const { data: endpoints } = await listWebhooks(db, organizationId);
  return data({ endpoints, supportedEvents: SUPPORTED_EVENTS.map((e) => e.value) });
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);

  if (!(await isAdmin(db, organizationId, session.user.id))) {
    return data({ error: "Only admins can manage webhooks" }, { status: 403 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return data({ error: "Invalid JSON body" }, { status: 400 });
  }

  const intentResult = IntentSchema.safeParse(rawBody);
  if (!intentResult.success) {
    return data({ error: "Unknown intent" }, { status: 400 });
  }
  const { intent } = intentResult.data;

  if (intent === "create") {
    const parsed = CreateWebhookSchema.safeParse(rawBody);
    if (!parsed.success) {
      return data({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const result = await createWebhook(db, organizationId, parsed.data);
    if ("error" in result) {
      return data({ error: "Webhook endpoint limit reached (max 10)" }, { status: 422 });
    }
    return data({ success: true, endpoint: result.data });
  }

  const idResult = IdSchema.safeParse(rawBody);
  if (!idResult.success) {
    return data({ error: "id is required" }, { status: 400 });
  }
  const { id } = idResult.data;

  if (intent === "update") {
    const parsed = UpdateWebhookSchema.safeParse(rawBody);
    if (!parsed.success) {
      return data({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const result = await updateWebhook(db, organizationId, id, parsed.data);
    if (!result) return data({ error: "Webhook endpoint not found" }, { status: 404 });
    return data({ success: true });
  }

  if (intent === "rotate_secret") {
    const secret = await rotateWebhookSecret(db, organizationId, id);
    if (!secret) return data({ error: "Webhook endpoint not found" }, { status: 404 });
    return data({ success: true, secret });
  }

  if (intent === "reveal_secret") {
    const secret = await getWebhookSecret(db, organizationId, id);
    if (!secret) return data({ error: "Webhook endpoint not found" }, { status: 404 });
    return data({ success: true, secret });
  }

  const ok = await deleteWebhook(db, organizationId, id);
  if (!ok) return data({ error: "Webhook endpoint not found" }, { status: 404 });
  return data({ success: true });
}
