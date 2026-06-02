import { SidebarTrigger } from "@components/ui/sidebar";
import { AnalyticsOverview } from "@features/analytics/components/analytics-overview";
import { loadAnalyticsOverview } from "@features/analytics/server/overview.server";

import type { Route } from "./+types/analytics";

export function meta() {
  return [{ title: "Analytics – Feediyo" }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  return loadAnalyticsOverview(request, params.orgSlug, context);
}

export default function AnalyticsPage({ loaderData }: Route.ComponentProps) {
  const data = loaderData;

  return (
        <div className="flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-3 border-b shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <h1 className="text-lg font-bold">Analytics</h1>
            </div>
          </div>
          <AnalyticsOverview data={data} />
        </div>
  );
}
