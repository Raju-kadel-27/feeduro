import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { member, webhookEndpoints } from "@/db/schema";

export const EP_COLS = {
  id: true,
  name: true,
  url: true,
  events: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type EpRow = {
  id: string;
  name: string | null;
  url: string;
  events: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function fmtEndpoint(ep: EpRow) {
  return { ...ep, events: JSON.parse(ep.events) as string[] };
}

export async function listWebhooks(db: Db, organizationId: string) {
  const rows = await db
    .select(EP_COLS)
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.organizationId, organizationId))
    .orderBy(asc(webhookEndpoints.createdAt));
  return { data: rows.map(fmtEndpoint) };
}

export async function getWebhookSecret(db: Db, organizationId: string, id: string) {
  const ep = await db.query.webhookEndpoints.findFirst({
    where: and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organizationId)),
    columns: { secret: true },
  });
  return ep?.secret ?? null;
}

export async function getWebhook(db: Db, organizationId: string, id: string) {
  const ep = await db.query.webhookEndpoints.findFirst({
    where: and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organizationId)),
    columns: EP_COLS,
  });
  return ep ? fmtEndpoint(ep) : null;
}

export async function getWebhookDetailLoaderData(
  db: Db,
  sessionUserId: string,
  organizationId: string,
  endpointId: string,
) {
  const [ep, memberRecord] = await Promise.all([
    db.query.webhookEndpoints.findFirst({
      where: and(
        eq(webhookEndpoints.id, endpointId),
        eq(webhookEndpoints.organizationId, organizationId),
      ),
      columns: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
        lastDeliveryAt: true,
        lastDeliveryStatus: true,
      },
    }),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, sessionUserId)),
      columns: { role: true },
    }),
  ]);

  if (!ep) return null;
  return { endpoint: ep, isAdmin: memberRecord?.role === "admin" };
}

export async function getWebhooksLoaderData(db: Db, sessionUserId: string, organizationId: string) {
  const [endpoints, memberRecord] = await Promise.all([
    db.query.webhookEndpoints.findMany({
      where: eq(webhookEndpoints.organizationId, organizationId),
      columns: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
        lastDeliveryAt: true,
        lastDeliveryStatus: true,
      },
    }),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, sessionUserId)),
      columns: { role: true },
    }),
  ]);

  return { endpoints, isAdmin: memberRecord?.role === "admin" };
}
