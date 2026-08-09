import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import type { Db } from "@feeduro/db";
import { webhookEndpoints } from "@feeduro/db/schema";
import { CreateWebhookSchema, MAX_PER_ORG, UpdateWebhookSchema } from "./schemas";

export { CreateWebhookSchema, UpdateWebhookSchema } from "./schemas";

function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createWebhook(
  db: Db,
  organizationId: string,
  input: z.infer<typeof CreateWebhookSchema>,
) {
  const count = await db.$count(
    webhookEndpoints,
    eq(webhookEndpoints.organizationId, organizationId),
  );
  if (count >= MAX_PER_ORG) return { error: "limit_reached" as const };

  const secret = generateSecret();
  const [ep] = await db
    .insert(webhookEndpoints)
    .values({
      id: createId(),
      organizationId,
      name: input.name?.trim() ?? null,
      url: input.url,
      secret,
      events: JSON.stringify(input.events),
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
      updatedAt: webhookEndpoints.updatedAt,
    });

  return { data: { ...ep, events: JSON.parse(ep.events) as string[] } };
}

export async function updateWebhook(
  db: Db,
  organizationId: string,
  id: string,
  input: z.infer<typeof UpdateWebhookSchema>,
) {
  const existing = await db.query.webhookEndpoints.findFirst({
    where: and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!existing) return null;

  const set: Record<string, unknown> = {};
  if (input.url !== undefined) set.url = input.url;
  if (input.name !== undefined) set.name = input.name?.trim() ?? null;
  if (input.events !== undefined) set.events = JSON.stringify(input.events);
  if (input.isActive !== undefined) set.isActive = input.isActive;

  await db
    .update(webhookEndpoints)
    .set(set)
    .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organizationId)));

  return true;
}

export async function deleteWebhook(db: Db, organizationId: string, id: string) {
  const existing = await db.query.webhookEndpoints.findFirst({
    where: and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!existing) return false;

  await db
    .delete(webhookEndpoints)
    .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organizationId)));
  return true;
}

export async function rotateWebhookSecret(db: Db, organizationId: string, id: string) {
  const existing = await db.query.webhookEndpoints.findFirst({
    where: and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!existing) return null;

  const secret = generateSecret();
  await db
    .update(webhookEndpoints)
    .set({ secret })
    .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organizationId)));

  return secret;
}
