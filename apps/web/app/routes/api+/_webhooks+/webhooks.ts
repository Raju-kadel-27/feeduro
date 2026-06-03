import { requireOrganization } from "@features/auth/server/guards";
import { isAdmin } from "@features/roles/server/queries";
import { SUPPORTED_EVENTS } from "@features/webhooks/constants";
import { CreateWebhookSchema, UpdateWebhookSchema } from "@features/webhooks/schemas/endpoint";
import {
  createWebhook,
  deleteWebhook,
  rotateWebhookSecret,
  updateWebhook,
} from "@features/webhooks/server/api-webhooks";
import { listWebhooks } from "@features/webhooks/server/queries";
import { data } from "react-router";
import { z } from "zod";

import type { Route } from "./+types/webhooks";

const IntentSchema = z.object({
  intent: z.enum(["create", "update", "rotate_secret", "delete"]),
});
const IdSchema = z.object({ id: z.string().min(1) });

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);
  const { data: endpoints } = await listWebhooks(organizationId);
  return data({ endpoints, supportedEvents: SUPPORTED_EVENTS.map((e) => e.value) });
}

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);

  if (!(await isAdmin(organizationId, session.user.id))) {
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
    const result = await createWebhook(organizationId, parsed.data);
    if ("error" in result) {
      return data({ error: `Webhook endpoint limit reached (max 10)` }, { status: 422 });
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
    const result = await updateWebhook(organizationId, id, parsed.data);
    if (!result) return data({ error: "Webhook endpoint not found" }, { status: 404 });
    return data({ success: true });
  }

  if (intent === "rotate_secret") {
    const secret = await rotateWebhookSecret(organizationId, id);
    if (!secret) return data({ error: "Webhook endpoint not found" }, { status: 404 });
    return data({ success: true, secret });
  }

  // intent === "delete"
  const ok = await deleteWebhook(organizationId, id);
  if (!ok) return data({ error: "Webhook endpoint not found" }, { status: 404 });
  return data({ success: true });
}
