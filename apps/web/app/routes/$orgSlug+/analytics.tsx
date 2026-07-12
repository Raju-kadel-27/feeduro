import { SidebarTrigger } from "@components/ui/sidebar";
import { Skeleton } from "@components/ui/skeleton";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { BoardFilter } from "@features/internal/analytics/components/board-filter";
import { DateRangePicker } from "@features/internal/analytics/components/date-range-picker";
import { loadAnalyticsOverview } from "@features/internal/analytics/server/overview";
import { UpgradeWall } from "@features/internal/billing/components/upgrade-wall";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import { lazy, Suspense } from "react";
import { useParams } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/analytics";

const AnalyticsOverview = lazy(() =>
  import("@features/internal/analytics/components/analytics-overview").then((m) => ({
    default: m.AnalyticsOverview,
  })),
);

export function meta() {
  return [{ title: "Analytics – Feeduro" }];
}

export function shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate }: Route.ShouldRevalidateArgs) {
  if (currentUrl.pathname === nextUrl.pathname) return false;
  return defaultShouldRevalidate;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrgBySlug(db, request, params.orgSlug);
  const planLimits = await getOrgPlanLimits(db, organizationId);
  if (!planLimits.analytics) return { planLocked: true as const };
  return loadAnalyticsOverview(db, request, params.orgSlug, context);
}

export default function AnalyticsPage({ loaderData }: Route.ComponentProps) {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  if ("planLocked" in loaderData) {
    return <UpgradeWall feature="analytics" orgSlug={orgSlug!} />;
  }

  const data = loaderData;

  return (
        <div className="flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-3 border-b shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <h1 className="text-lg font-bold">Analytics</h1>
            </div>
            <div className="flex items-center gap-2">
              <BoardFilter boards={data.boards} />
              <DateRangePicker />
            </div>
          </div>
          <Suspense fallback={<AnalyticsOverviewSkeleton />}>
            <AnalyticsOverview data={data} />
          </Suspense>
        </div>
  );
}

function AnalyticsOverviewSkeleton() {
  return (
    <div className="p-6 grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
      <Skeleton className="col-span-2 h-64 rounded-xl md:col-span-4" />
      <Skeleton className="col-span-2 h-64 rounded-xl" />
      <Skeleton className="col-span-2 h-64 rounded-xl" />
    </div>
  );
}
