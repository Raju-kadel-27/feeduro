import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import type { BrandingMeta } from "@features/branding/server/parse-branding";
import { DEFAULT_BRANDING, parseBranding } from "@features/branding/server/parse-branding";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import { eq } from "drizzle-orm";
import { data } from "react-router";
import { organization } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/branding";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
  });

  if (!org) return data({ error: "Organization not found" }, { status: 404 });

  return data({
    logo: org.logo ?? "",
    name: org.name,
    ...parseBranding(org.metadata),
  });
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);
  await requirePermission(db, organizationId, session.user.id, { settings: ["update"] });

  const body = (await request.json()) as {
    logo?: string;
    name?: string;
    primaryColor?: string;
    theme?: string;
    language?: string;
    hidePoweredBy?: boolean;
  };

  const [org, planLimits] = await Promise.all([
    db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
      columns: { metadata: true, logo: true, name: true },
    }),
    getOrgPlanLimits(db, organizationId),
  ]);

  if (!org) return data({ error: "Organization not found" }, { status: 404 });

  if (body.hidePoweredBy && !planLimits.hidePoweredBy) {
    return data({ error: "Upgrade to Pro to hide Feeduro branding." }, { status: 403 });
  }

  let existingMeta: Record<string, unknown> = {};
  if (org.metadata) {
    try {
      existingMeta = JSON.parse(org.metadata) as Record<string, unknown>;
    } catch {}
  }

  const branding: BrandingMeta = {
    primaryColor: body.primaryColor ?? DEFAULT_BRANDING.primaryColor,
    theme: (body.theme as BrandingMeta["theme"]) ?? DEFAULT_BRANDING.theme,
    language: body.language ?? DEFAULT_BRANDING.language,
    hidePoweredBy: body.hidePoweredBy ?? DEFAULT_BRANDING.hidePoweredBy,
  };

  await db
    .update(organization)
    .set({
      ...(body.name ? { name: body.name } : {}),
      ...(body.logo !== undefined ? { logo: body.logo || null } : {}),
      metadata: JSON.stringify({ ...existingMeta, branding }),
    })
    .where(eq(organization.id, organizationId));

  return data({ success: true });
}
