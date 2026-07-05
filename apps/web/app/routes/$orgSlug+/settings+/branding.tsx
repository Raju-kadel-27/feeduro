import { PageHeader } from "@components/common/page-header";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { BrandingForm } from "@features/branding/components/branding-form";
import { brandingSchema } from "@features/branding/schemas/branding.schema";
import type { BrandingFormValues } from "@features/branding/types/branding.types";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import { eq } from "drizzle-orm";
import { Palette } from "lucide-react";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { organization } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/branding";

export function meta() {
  return [{ title: "Branding — Feeduro" }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

  const [org, planLimits] = await Promise.all([
    db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
      columns: { logo: true, name: true, metadata: true },
    }),
    getOrgPlanLimits(db, organizationId),
  ]);

  let brandingOverrides: Partial<BrandingFormValues> = {};

  if (org?.metadata) {
    try {
      const parsed = JSON.parse(org.metadata) as Record<string, unknown>;
      if (parsed.branding && typeof parsed.branding === "object") {
        const result = brandingSchema.partial().safeParse(parsed.branding);
        if (result.success) {
          brandingOverrides = result.data;
        }
      }
    } catch {}
  }

  const defaultValues = {
    logo: org?.logo ?? "",
    name: org?.name ?? "",
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
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>

      <main className="p-6 max-w-[1100px] mx-auto w-full space-y-8">
        <PageHeader
          title="Branding"
          description="Customize how your workspace looks to your users — logo, colors, and more."
          icon={Palette}
        />

        <BrandingForm defaultValues={loaderData.defaultValues} canHidePoweredBy={loaderData.canHidePoweredBy} />
      </main>
    </>
  );
}
