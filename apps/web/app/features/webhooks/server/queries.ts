import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { member, webhookEndpoints } from "@/db/schema";
import type { EndpointRow } from "../types";

export async function getWebhooksLoaderData(sessionUserId: string, organizationId: string) {
  const db = getDb();

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
      },
    }),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, sessionUserId)),
    }),
  ]);

  return {
    endpoints: endpoints as EndpointRow[],
    isAdmin: memberRecord?.role === "admin",
  };
}
