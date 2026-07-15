import { PageHeader } from "@components/common/page-header";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { PlanBanner } from "@features/internal/billing/components/plan-banner";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import WebhooksSettings from "@features/internal/webhooks/components/webhooks-settings";
import { getWebhooksLoaderData } from "@features/internal/webhooks/server/queries";
import { Star, Webhook } from "lucide-react";
import { Link } from "react-router";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/index";

export function meta() {
  return [{ title: "Webhooks — Feeduro" }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);
  const planLimits = await getOrgPlanLimits(db, organizationId);
  if (planLimits.webhooks === 0) return { planLocked: true as const };
  return getWebhooksLoaderData(db, session.user.id, organizationId);
}

export default function WebhooksRoute({ loaderData, params }: Route.ComponentProps) {
  const orgSlug = params.orgSlug;

  if ("planLocked" in loaderData) {
    return (
      <>
        <header className="flex h-14 shrink-0 items-center px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
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
      </>
    );
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <WebhooksSettings loaderData={loaderData} />
    </>
  );
}
