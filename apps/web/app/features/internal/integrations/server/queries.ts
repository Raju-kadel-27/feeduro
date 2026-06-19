import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
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

export async function getIntegration(organizationId: string, provider: IntegrationProvider) {
  const db = getDb();
  return db.query.integrations.findFirst({
    where: and(
      eq(integrations.organizationId, organizationId),
      eq(integrations.provider, provider),
    ),
  });
}

export async function getIntegrationToken(
  organizationId: string,
  provider: IntegrationProvider,
): Promise<string | null> {
  const db = getDb();
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
  organizationId: string,
): Promise<NotificationSettings> {
  const db = getDb();
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
  organizationId: string,
  patch: Partial<NotificationSettings>,
): Promise<void> {
  const db = getDb();
  const current = await getNotificationSettings(organizationId);
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

export async function getOrgSlugFromId(orgId: string): Promise<string | null> {
  const db = getDb();
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, orgId),
    columns: { slug: true },
  });
  return org?.slug ?? null;
}
