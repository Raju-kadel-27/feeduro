import { and, eq } from "drizzle-orm";
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
  | "shortcut";

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

export async function getOrgSlugFromId(orgId: string): Promise<string | null> {
  const db = getDb();
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, orgId),
    columns: { slug: true },
  });
  return org?.slug ?? null;
}
