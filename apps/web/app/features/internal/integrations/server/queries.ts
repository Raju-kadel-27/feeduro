import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { integrations, organization } from "@/db/schema";

export type IntegrationProvider =
  | "github"
  | "linear"
  | "jira"
  | "asana"
  | "notion"
  | "monday"
  | "trello"
  | "zapier"
  | "n8n"
  | "zendesk"
  | "hubspot"
  | "salesforce"
  | "shortcut"
  | "clickup"
  | "notifications";

export function parseSettings<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function getIntegration(db: Db, organizationId: string, provider: IntegrationProvider) {
  return db.query.integrations.findFirst({
    where: and(
      eq(integrations.organizationId, organizationId),
      eq(integrations.provider, provider),
    ),
  });
}

export async function getIntegrationToken(
  db: Db,
  organizationId: string,
  provider: IntegrationProvider,
): Promise<string | null> {
  const row = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.organizationId, organizationId),
      eq(integrations.provider, provider),
    ),
    columns: { accessToken: true },
  });
  return row?.accessToken ?? null;
}

export interface NotificationSettings {
  enabledEvents?: string[];
  discordWebhookUrl?: string | null;
  discordChannelId?: string | null;
  slackWebhookUrl?: string | null;
  slackChannel?: string | null;
}

export async function getNotificationSettings(
  db: Db,
  organizationId: string,
): Promise<NotificationSettings> {
  const row = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.organizationId, organizationId),
      eq(integrations.provider, "notifications"),
    ),
    columns: { settings: true },
  });
  return parseSettings<NotificationSettings>(row?.settings) ?? {};
}

export async function upsertNotificationSettings(
  db: Db,
  organizationId: string,
  patch: Partial<NotificationSettings>,
): Promise<void> {
  const current = await getNotificationSettings(db, organizationId);
  const merged: Record<string, unknown> = { ...current };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined) {
      delete merged[k];
    } else {
      merged[k] = v;
    }
  }
  const settings = JSON.stringify(merged);
  await db
    .insert(integrations)
    .values({ organizationId, provider: "notifications", settings })
    .onConflictDoUpdate({
      target: [integrations.organizationId, integrations.provider],
      set: { settings, updatedAt: sql`now()` },
    });
}

export async function getOrgSlugFromId(db: Db, orgId: string): Promise<string | null> {
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, orgId),
    columns: { slug: true },
  });
  return org?.slug ?? null;
}
