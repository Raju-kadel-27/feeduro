import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { AnalyticsOverview } from "@features/analytics/components/analytics-overview";
import { loadAnalyticsOverview } from "@features/analytics/server/overview.server";
import { AppSidebar } from "@features/layout/components/app-sidebar";
import { useLoaderData } from "react-router";

import type { Route } from "./+types/analytics";

export function meta() {
  return [{ title: "Analytics – Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  return loadAnalyticsOverview(request, params.orgSlug);
}

export default function AnalyticsPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">{data.user.name ?? data.user.email}</span>
        </header>

        <div className="flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b shrink-0">
            <h1 className="text-base font-semibold">Analytics</h1>
            <span className="text-xs text-muted-foreground tabular-nums">
              {data.stats.totalPosts} {data.stats.totalPosts === 1 ? "post" : "posts"} total
            </span>
          </div>

          <AnalyticsOverview data={data} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
