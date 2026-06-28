import { PageHeader } from "@components/common/page-header";
import { SidebarTrigger } from "@components/ui/sidebar";
import { ColumnSkeleton } from "@features/roadmap/components/internal/column-skeleton";
import { KanbanBoard } from "@features/roadmap/components/internal/kanban-board";
import { useRoadmap } from "@features/roadmap/hooks/use-roadmap";
import { loadRoadmapData } from "@features/roadmap/server/queries";
import type { Post } from "@features/roadmap/types";
import { useDragToScroll } from "@hooks/use-drag-to-scroll";
import { useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { useLoaderData, useParams } from "react-router";
import type { Route } from "./+types/roadmap";

const PostDetailPanel = lazy(() =>
  import("@features/internal/post-detail-panel/components/post-detail-panel").then((m) => ({
    default: m.PostDetailPanel,
  })),
);

export function meta() {
  return [{ title: "Roadmap – Feeduro" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  return loadRoadmapData(request, params.orgSlug);
}

export default function RoadmapPage() {
  const loaderData = useLoaderData<typeof loader>();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const { posts, isLoading, updateStatus, updateRank } = useRoadmap(
    loaderData.posts as Post[],
    loaderData.fetchedAt,
  );
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const dragScroll = useDragToScroll();

  return (
    <div className="flex flex-col h-svh">
      <header className="flex shrink-0 items-center gap-3 px-8 pt-3 pb-4">
        <SidebarTrigger className="-ml-1" />
        <PageHeader title="Roadmap" />
      </header>

      <div className="flex-1 min-h-0 px-8">
        <div
          ref={dragScroll.ref}
          className="h-full overflow-x-auto overflow-y-hidden pb-5 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={dragScroll.onMouseDown}
          onMouseMove={dragScroll.onMouseMove}
          onMouseUp={dragScroll.onMouseUp}
          onMouseLeave={dragScroll.onMouseLeave}
        >
          {isLoading ? (
            <ColumnSkeleton />
          ) : (
            <KanbanBoard
              posts={posts}
              onStatusChange={(id, status) => updateStatus({ id, status })}
              onRankChange={(status, orderedIds) => updateRank({ status, orderedIds })}
              onOpen={setSelectedPostId}
            />
          )}
        </div>
      </div>

      {selectedPostId && orgSlug && (
        <Suspense>
          <PostDetailPanel
            key={selectedPostId}
            postId={selectedPostId}
            orgSlug={orgSlug}
            onClose={() => setSelectedPostId(null)}
            onDataChange={() => qc.invalidateQueries({ queryKey: ["roadmap"] })}
            onOpenPost={(id) => setSelectedPostId(id)}
          />
        </Suspense>
      )}
    </div>
  );
}
