import { requireOrganization } from "@lib/session.server";
import { eq } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { organization } from "@/db/schema";
import type { Route } from "./+types/privacy-settings";

export interface PrivacySettings {
  allowGuestSubmissions: boolean;
  moderateSubmissions: boolean;
  maskPublicIdentities: boolean;
}

const DEFAULTS: PrivacySettings = {
  allowGuestSubmissions: false,
  moderateSubmissions: false,
  maskPublicIdentities: false,
};

export function parsePrivacySettings(metadata: string | null): PrivacySettings {
  if (!metadata) return DEFAULTS;
  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    return { ...DEFAULTS, ...((parsed.privacySettings as Partial<PrivacySettings>) ?? {}) };
  } catch {
    return DEFAULTS;
  }
}

export async function action({ request }: Route.ActionArgs) {
  const { organizationId } = await requireOrganization(request);
  const db = getDb();

  const body = (await request.json()) as Partial<PrivacySettings>;

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
  });

  if (!org) return data({ error: "Organization not found" }, { status: 404 });

  let existingMeta: Record<string, unknown> = {};
  if (org.metadata) {
    try {
      existingMeta = JSON.parse(org.metadata) as Record<string, unknown>;
    } catch {}
  }

  const privacySettings: PrivacySettings = {
    allowGuestSubmissions: body.allowGuestSubmissions ?? DEFAULTS.allowGuestSubmissions,
    moderateSubmissions: body.moderateSubmissions ?? DEFAULTS.moderateSubmissions,
    maskPublicIdentities: body.maskPublicIdentities ?? DEFAULTS.maskPublicIdentities,
  };

  await db
    .update(organization)
    .set({ metadata: JSON.stringify({ ...existingMeta, privacySettings }) })
    .where(eq(organization.id, organizationId));

  return data({ success: true });
}
