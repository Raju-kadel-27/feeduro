import type { BrandingFormValues } from "@components/branding/branding-form";
import { BrandingForm } from "@components/branding/branding-form";
import { AppSidebar } from "@components/layout/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { requireOrgBySlug } from "@lib/session.server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organization } from "@/db/schema";
import type { Route } from "./+types/branding";

export function meta() {
  return [{ title: "Branding — Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
  });

  const defaults = {
    primaryColor: "indigo" as const,
    theme: "dynamic" as const,
    language: "auto" as const,
    hidePoweredBy: false,
  };

  if (org?.metadata) {
    try {
      const parsed = JSON.parse(org.metadata) as Record<string, unknown>;
      if (parsed.branding && typeof parsed.branding === "object") {
        Object.assign(defaults, parsed.branding);
      }
    } catch {}
  }

  return {
    logo: org?.logo ?? "",
    name: org?.name ?? "",
    ...defaults,
  } satisfies BrandingFormValues;
}

export default function BrandingSettings({ loaderData }: Route.ComponentProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">Branding</span>
        </header>

        <main className="p-6 max-w-3xl mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-xl font-semibold">Branding</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Customize how your public board looks to your users.
            </p>
          </div>

          <BrandingForm defaultValues={loaderData} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
