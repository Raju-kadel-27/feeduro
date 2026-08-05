import { PageHeader } from "@components/common/page-header";
import { RouteErrorMessage } from "@components/common/route-error";
import { SettingsContentSkeleton } from "@components/common/settings-skeleton";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { PlanBanner } from "@features/internal/billing/components/plan-banner";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import { AddProviderDialog } from "@features/internal/sso/components/add-provider-dialog";
import { ProviderList } from "@features/internal/sso/components/provider-list";
import { loadSSOSettings } from "@features/internal/sso/server/queries";
import { KeyRound, Star } from "lucide-react";
import { Suspense } from "react";
import { Await, Link, useParams } from "react-router";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/sso";

type SSOData = Awaited<ReturnType<typeof loadSSOSettings>> | { planLocked: true };

export function meta() {
  return [{ title: "Login & SSO — Feeduro" }];
}

export function shouldRevalidate() {
  return false;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);
  const dataPromise: Promise<SSOData> = Promise.all([
    getOrgPlanLimits(db, organizationId),
    loadSSOSettings(db, organizationId, session.user.id),
  ]).then(([planLimits, loaderData]) => {
    if (!planLimits.sso) return { planLocked: true as const };
    return loaderData;
  });
  return { dataPromise };
}

export function ErrorBoundary() {
  return <RouteErrorMessage resource="SSO settings" />;
}

export default function SSOSettings({ loaderData }: Route.ComponentProps) {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <Suspense fallback={<SettingsContentSkeleton />}>
        <Await
          resolve={loaderData.dataPromise as unknown as Promise<SSOData>}
          errorElement={<RouteErrorMessage resource="SSO settings" />}
        >
          {(pageData) => {
            if ("planLocked" in pageData) {
              return (
                <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
                  <PageHeader
                    title="Login & SSO"
                    icon={KeyRound}
                    action={
                      <Link
                        to={`/${orgSlug}/settings/billing`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                      >
                        <Star className="h-4 w-4 fill-amber-300 text-amber-300" aria-hidden="true" />
                        Upgrade
                      </Link>
                    }
                  />
                  <PlanBanner>
                    Single Sign-On is available on the <span className="font-semibold">Professional</span> plan.
                  </PlanBanner>
                </main>
              );
            }

            const { providers, isAdmin, baseUrl } = pageData;
            return (
              <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
                <PageHeader
                  title="Login & SSO"
                  icon={KeyRound}
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
            );
          }}
        </Await>
      </Suspense>
    </>
  );
}
