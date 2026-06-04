import { SidebarTrigger } from "@components/ui/sidebar";
import { AddProviderDialog } from "@features/sso/components/add-provider-dialog";
import { ProviderList } from "@features/sso/components/provider-list";
import { loadSSOSettings } from "@features/sso/server/queries";
import { KeyRound } from "lucide-react";
import { data } from "react-router";

import type { Route } from "./+types/sso";

export function meta() {
  return [{ title: "Login & SSO — Feediyo" }];
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
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <span className="text-sm font-medium">Login &amp; SSO</span>
      </header>

      <main className="p-6 max-w-[840px] mx-auto w-full space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">Single Sign-On</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Allow workspace members to sign in with your identity provider via OIDC or SAML.
            </p>
          </div>
          {isAdmin && <AddProviderDialog baseUrl={baseUrl} />}
        </div>

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
