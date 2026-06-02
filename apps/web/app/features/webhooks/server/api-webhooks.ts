import { SUPPORTED_EVENTS } from "@features/webhooks/constants";
import { createId } from "@paralleldrive/cuid2";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { webhookEndpoints } from "@/db/schema";

const VALID_EVENTS = SUPPORTED_EVENTS.map((e) => e.value);
const MAX_PER_ORG = 10;

const eventsRefine = (evts: string[]) =>
  evts.includes("*") || evts.every((e) => VALID_EVENTS.includes(e));
const eventsMsg = `events must be ["*"] or a subset of: ${VALID_EVENTS.join(", ")}`;

export const CreateWebhookSchema = z.object({
  url: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://"), { message: "URL must use HTTPS" }),
  name: z.string().max(100).optional(),
  events: z.array(z.string()).default(["*"]).refine(eventsRefine, { message: eventsMsg }),
});

export const UpdateWebhookSchema = z
  .object({
    url: z
      .string()
      .url()
      .refine((u) => u.startsWith("https://"), { message: "URL must use HTTPS" })
      .optional(),
    name: z.string().max(100).nullable().optional(),
    events: z.array(z.string()).refine(eventsRefine, { message: eventsMsg }).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.url !== undefined || d.name !== undefined || d.events !== undefined || d.isActive !== undefined,
    { message: "At least one field must be provided" },
  );

const EP_COLS = {
  id: true,
  name: true,
  url: true,
  events: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

type EpRow = {
  id: string;
  name: string | null;
  url: string;
  events: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function fmt(ep: EpRow) {
  return { ...ep, events: JSON.parse(ep.events) as string[] };
}

function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function listWebhooks(organizationId: string) {
  const db = getDb();
  const rows = await db
    .select(EP_COLS)
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.organizationId, organizationId))
    .orderBy(asc(webhookEndpoints.createdAt));
  return { data: rows.map(fmt) };
}

export async function getWebhook(organizationId: string, id: string) {
  const db = getDb();
  const ep = await db.query.webhookEndpoints.findFirst({
    where: and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organizationId)),
    columns: EP_COLS,
  });
  return ep ? fmt(ep) : null;
}

export async function createWebhook(
  organizationId: string,
  input: z.infer<typeof CreateWebhookSchema>,
) {
  const db = getDb();
  const count = await db.$count(webhookEndpoints, eq(webhookEndpoints.organizationId, organizationId));
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
  organizationId: string,
  id: string,
  input: z.infer<typeof UpdateWebhookSchema>,
) {
  const db = getDb();
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

export async function deleteWebhook(organizationId: string, id: string) {
  const db = getDb();
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
