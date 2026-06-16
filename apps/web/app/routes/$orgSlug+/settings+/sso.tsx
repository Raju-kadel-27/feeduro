import { PageHeader } from "@components/common/page-header";
import { AddProviderDialog } from "@features/internal/sso/components/add-provider-dialog";
import { ProviderList } from "@features/internal/sso/components/provider-list";
import { loadSSOSettings } from "@features/internal/sso/server/queries";
import { KeyRound } from "lucide-react";
import { data } from "react-router";
import { SidebarTrigger } from "@/app/components/ui/sidebar";

import type { Route } from "./+types/sso";

export function meta() {
  return [{ title: "Login & SSO — Feeduro" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  return data(await loadSSOSettings(request, params.orgSlug));
}

export function ErrorBoundary() {
  return (
    <div className="p-6">
      <p className="text-sm text-destructive">Failed to load SSO settings. Please refresh.</p>
    </div>
  );
}

export default function SSOSettings({ loaderData }: Route.ComponentProps) {
  const { providers, isAdmin, baseUrl } = loaderData;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>

      <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
        <PageHeader
          title="Login & SSO"
          action={isAdmin ? <AddProviderDialog baseUrl={baseUrl} /> : undefined}
        />

        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">Configured Providers</h3>
          <ProviderList providers={providers} isAdmin={isAdmin} />
        </section>

        <section className="rounded-lg border border-border bg-muted/10 px-6 py-4 space-y-2">
          <div className="flex items-center gap-2">
            <KeyRound size={15} className="text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold text-foreground">SSO sign-in endpoint</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Users can sign in with SSO from the login page by entering their work email. They will
            be redirected to your identity provider automatically.
          </p>
        </section>
      </main>
    </>
  );
}
