import { SidebarTrigger } from "@components/ui/sidebar";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { getOrgPlanLimits } from "@features/billing/server/plan-limits";
import { BrandingForm } from "@features/branding/components/branding-form";
import { brandingSchema } from "@features/branding/schemas/branding.schema";
import type { BrandingFormValues } from "@features/branding/types/branding.types";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organization } from "@/db/schema";
import type { Route } from "./+types/branding";

export function meta() {
  return [{ title: "Branding — Feeduro" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const [org, planLimits] = await Promise.all([
    db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
      columns: { logo: true, name: true, metadata: true },
    }),
    getOrgPlanLimits(organizationId),
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
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">Branding</span>
        </header>

        <main className="p-6 max-w-[1100px] mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-xl font-semibold">Branding</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Customize how your public board looks to your users.
            </p>
          </div>

          <BrandingForm defaultValues={loaderData.defaultValues} canHidePoweredBy={loaderData.canHidePoweredBy} />
        </main>
        </>
  );
}
