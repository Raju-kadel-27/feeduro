import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { member, webhookEndpoints } from "@/db/schema";
import type { EndpointRow } from "../types";

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

export async function listWebhooks(organizationId: string) {
  const db = getDb();
  const rows = await db
    .select(EP_COLS)
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.organizationId, organizationId))
    .orderBy(asc(webhookEndpoints.createdAt));
  return { data: rows.map(fmtEndpoint) };
}

export async function getWebhook(organizationId: string, id: string) {
  const db = getDb();
  const ep = await db.query.webhookEndpoints.findFirst({
    where: and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organizationId)),
    columns: EP_COLS,
  });
  return ep ? fmtEndpoint(ep) : null;
}

export async function getWebhooksLoaderData(sessionUserId: string, organizationId: string) {
  const db = getDb();

  const [endpoints, memberRecord] = await Promise.all([
    db.query.webhookEndpoints.findMany({
      where: eq(webhookEndpoints.organizationId, organizationId),
      columns: { id: true, name: true, url: true, events: true, isActive: true, createdAt: true },
    }),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, sessionUserId)),
      columns: { role: true },
    }),
  ]);

  return {
    endpoints: endpoints as EndpointRow[],
    isAdmin: memberRecord?.role === "admin",
  };
}
