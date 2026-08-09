import { PageHeader } from "@components/common/page-header";
import { RouteErrorMessage } from "@components/common/route-error";
import { SettingsContentSkeleton } from "@components/common/settings-skeleton";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { PlanBanner } from "@features/internal/billing/components/plan-banner";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import WebhooksSettings from "@features/internal/webhooks/components/webhooks-settings";
import { getWebhooksLoaderData } from "@features/internal/webhooks/server/queries";
import { Star, Webhook } from "lucide-react";
import { Suspense } from "react";
import { Await, Link } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/index";

type WebhooksData = Awaited<ReturnType<typeof getWebhooksLoaderData>> | { planLocked: true };

export function meta() {
  return [{ title: "Webhooks — Feeduro" }];
}

export function shouldRevalidate() {
  return false;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);
  const dataPromise: Promise<WebhooksData> = Promise.all([
    getOrgPlanLimits(db, organizationId),
    getWebhooksLoaderData(db, session.user.id, organizationId),
  ]).then(([planLimits, loaderData]) => {
    if (planLimits.webhooks === 0) return { planLocked: true as const };
    return loaderData;
  });
  return { dataPromise };
}

export function ErrorBoundary() {
  return <RouteErrorMessage resource="webhook settings" />;
}

export default function WebhooksRoute({ loaderData, params }: Route.ComponentProps) {
  const orgSlug = params.orgSlug;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
      </header>
      <Suspense fallback={<SettingsContentSkeleton />}>
        <Await
          resolve={loaderData.dataPromise as unknown as Promise<WebhooksData>}
          errorElement={<RouteErrorMessage resource="webhook settings" />}
        >
          {(pageData) => {
            if ("planLocked" in pageData) {
              return (
                <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
                  <PageHeader
                    title="Webhooks"
                    icon={Webhook}
                    description="Receive HTTP POST notifications when events happen in your workspace. Every delivery is signed so you can verify authenticity."
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
                    Webhooks are available on the <span className="font-semibold">Starter</span> plan and above.
                  </PlanBanner>
                </main>
              );
            }
            return <WebhooksSettings loaderData={pageData} />;
          }}
        </Await>
      </Suspense>
    </>
  );
}
