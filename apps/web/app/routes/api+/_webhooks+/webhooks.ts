import { requireOrganization } from "@features/auth/server/guards";
import { isAdmin } from "@features/roles/server/queries";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { member, webhookEndpoints } from "@/db/schema";

import type { Route } from "./+types/webhooks";

const SUPPORTED_EVENTS = [
  "feedback.created",
  "feedback.status_changed",
  "comment.created",
  "changelog.created",
  "changelog.published",
];

function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const MAX_ENDPOINTS_PER_ORG = 10;

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateEvents(events: unknown): string[] | null {
  if (!Array.isArray(events) || events.length === 0) return null;
  if (events.includes("*")) return ["*"];
  const valid = events.every((e) => typeof e === "string" && SUPPORTED_EVENTS.includes(e));
  if (!valid) return null;
  return events as string[];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);

  const db = getDb();
  const endpoints = await db.query.webhookEndpoints.findMany({
    where: eq(webhookEndpoints.organizationId, organizationId),
    columns: {
      id: true,
      name: true,
      url: true,
      events: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      // secret is intentionally excluded from list responses
    },
  });

  return data({
    endpoints: endpoints.map((ep) => ({ ...ep, events: JSON.parse(ep.events) })),
    supportedEvents: SUPPORTED_EVENTS,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);

  if (!(await isAdmin(organizationId, session.user.id))) {
    return data({ error: "Only admins can manage webhooks" }, { status: 403 });
  }

  const db = getDb();
  const body = (await request.json()) as { intent: string; [key: string]: unknown };

  if (body.intent === "create") {
    const url = (body.url as string)?.trim();
    const rawEvents = body.events ?? ["*"];

    if (!url || !isValidUrl(url)) {
      return data({ error: "Webhook URL must be a valid HTTPS URL" }, { status: 400 });
    }

    const existingCount = await db.$count(
      webhookEndpoints,
      eq(webhookEndpoints.organizationId, organizationId),
    );
    if (existingCount >= MAX_ENDPOINTS_PER_ORG) {
      return data(
        { error: `Webhook endpoint limit reached (max ${MAX_ENDPOINTS_PER_ORG})` },
        { status: 422 },
      );
    }

    const events = validateEvents(rawEvents);
    if (!events) {
      return data(
        {
          error: `events must be an array containing "*" or a subset of: ${SUPPORTED_EVENTS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const name = (body.name as string | undefined)?.trim() || null;
    const secret = generateSecret();

    const [endpoint] = await db
      .insert(webhookEndpoints)
      .values({
        id: createId(),
        organizationId,
        name,
        url,
        secret,
        events: JSON.stringify(events),
        isActive: true,
      })
      .returning({
        id: webhookEndpoints.id,
        name: webhookEndpoints.name,
        url: webhookEndpoints.url,
        events: webhookEndpoints.events,
        isActive: webhookEndpoints.isActive,
        secret: webhookEndpoints.secret,
        createdAt: webhookEndpoints.createdAt,
      });

    // Return the secret only on creation — it won't be retrievable again
    return data({
      success: true,
      endpoint: { ...endpoint, events: JSON.parse(endpoint.events) },
    });
  }

  if (body.intent === "update") {
    const id = body.id as string;
    if (!id) return data({ error: "id is required" }, { status: 400 });

    const existing = await db.query.webhookEndpoints.findFirst({
      where: and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organizationId)),
    });
    if (!existing) return data({ error: "Webhook endpoint not found" }, { status: 404 });

    const updates: Partial<typeof existing> = {};

    if (body.name !== undefined) {
      updates.name = (body.name as string | undefined)?.trim() || null;
    }

    if (body.url !== undefined) {
      const url = (body.url as string)?.trim();
      if (!isValidUrl(url))
        return data({ error: "Webhook URL must be a valid HTTPS URL" }, { status: 400 });
      updates.url = url;
    }

    if (body.events !== undefined) {
      const events = validateEvents(body.events);
      if (!events) {
        return data(
          {
            error: `events must be an array containing "*" or a subset of: ${SUPPORTED_EVENTS.join(", ")}`,
          },
          { status: 400 },
        );
      }
      (updates as Record<string, unknown>).events = JSON.stringify(events);
    }

    if (typeof body.isActive === "boolean") {
      updates.isActive = body.isActive;
    }

    if (Object.keys(updates).length === 0) {
      return data({ error: "No valid fields to update" }, { status: 400 });
    }

    await db
      .update(webhookEndpoints)
      .set(updates)
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organizationId)));

    return data({ success: true });
  }

  if (body.intent === "rotate_secret") {
    const id = body.id as string;
    if (!id) return data({ error: "id is required" }, { status: 400 });

    const existing = await db.query.webhookEndpoints.findFirst({
      where: and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organizationId)),
    });
    if (!existing) return data({ error: "Webhook endpoint not found" }, { status: 404 });

    const secret = generateSecret();
    await db
      .update(webhookEndpoints)
      .set({ secret })
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organizationId)));

    return data({ success: true, secret });
  }

  if (body.intent === "delete") {
    const id = body.id as string;
    if (!id) return data({ error: "id is required" }, { status: 400 });

    await db
      .delete(webhookEndpoints)
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organizationId)));

    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
