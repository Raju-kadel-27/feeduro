import { PageHeader } from "@components/common/page-header";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { brandingSchema } from "@features/branding/schemas/branding.schema";
import type { BrandingFormValues } from "@features/branding/types/branding.types";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import { eq } from "drizzle-orm";
import { lazy, Suspense } from "react";
import { organization } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/branding";

const BrandingForm = lazy(() =>
  import("@features/branding/components/branding-form").then((m) => ({
    default: m.BrandingForm,
  })),
);

export function meta() {
  return [{ title: "Branding | Feeduro" }];
}

export function shouldRevalidate() {
  return false;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  // requireOrgBySlug already fetches name + logo (KV-cached); only fetch metadata here.
  const { organizationId, org: guardOrg } = await requireOrgBySlug(db, request, params.orgSlug);

  const [orgRow, planLimits] = await Promise.all([
    db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
      columns: { metadata: true },
    }),
    getOrgPlanLimits(db, organizationId),
  ]);

  let brandingOverrides: Partial<BrandingFormValues> = {};

  if (orgRow?.metadata) {
    try {
      const parsed = JSON.parse(orgRow.metadata) as Record<string, unknown>;
      if (parsed.branding && typeof parsed.branding === "object") {
        const result = brandingSchema.partial().safeParse(parsed.branding);
        if (result.success) {
          brandingOverrides = result.data;
        }
      }
    } catch {}
  }

  const defaultValues = {
    logo: guardOrg.logo ?? "",
    name: guardOrg.name ?? "",
    primaryColor: "indigo" as const,
    theme: "dynamic" as const,
    language: "auto" as const,
    hidePoweredBy: false,
    ...brandingOverrides,
  } satisfies BrandingFormValues;

  return { defaultValues, canHidePoweredBy: planLimits.hidePoweredBy };
}

export default function BrandingSettings({ loaderData }: Route.ComponentProps) {
  return (
    <main className="pb-6 pl-14 pr-10 w-full space-y-8">
      <div className="flex items-center gap-3 pt-4">
        <PageHeader
          title="Branding"
          description="Customize how your workspace looks to your users | logo, colors, and more."
        />
      </div>

      <Suspense>
        <BrandingForm defaultValues={loaderData.defaultValues} canHidePoweredBy={loaderData.canHidePoweredBy} />
      </Suspense>
    </main>
  );
}
