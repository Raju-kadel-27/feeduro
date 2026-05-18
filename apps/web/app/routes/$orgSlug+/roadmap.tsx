import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { AppSidebar } from "@features/layout/components/app-sidebar";
import { ColumnSkeleton } from "@features/roadmap/components/column-skeleton";
import { KanbanBoard } from "@features/roadmap/components/kanban-board";
import { useRoadmap } from "@features/roadmap/hooks/use-roadmap";
import { loadRoadmapData } from "@features/roadmap/server/queries";
import type { Post } from "@features/roadmap/types";
import { useLoaderData } from "react-router";
import type { Route } from "./+types/roadmap";

export function meta() {
  return [{ title: "Roadmap – Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  return loadRoadmapData(request, params.orgSlug);
}

export default function RoadmapPage() {
  const loaderData = useLoaderData<typeof loader>();
  const { posts, isLoading, updateStatus, patchGithubIssue } = useRoadmap(
    loaderData.posts as Post[],
    loaderData.fetchedAt,
  );
  const total = posts.length;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-sm font-semibold">Roadmap</h1>
          {!isLoading && total > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {total} {total === 1 ? "item" : "items"}
            </span>
          )}
          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">
            {loaderData.user.name ?? loaderData.user.email}
          </span>
        </header>

        <div className="flex flex-col h-[calc(100svh-3.5rem)] overflow-hidden">
          <div className="flex-1 overflow-x-auto overflow-y-hidden px-2 py-5">
            {isLoading ? (
              <ColumnSkeleton />
            ) : (
              <KanbanBoard
                posts={posts}
                onStatusChange={(id, status) => updateStatus({ id, status })}
                hasGithubIntegration={loaderData.hasGithubIntegration}
                onIssueCreated={patchGithubIssue}
              />
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
