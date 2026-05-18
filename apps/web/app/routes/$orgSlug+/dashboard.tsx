import { SidebarInset, SidebarProvider } from "@components/ui/sidebar";
import { Skeleton } from "@components/ui/skeleton";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { ListView } from "@features/dashboard/components/list-view";
import { RefineChipBar } from "@features/dashboard/components/refine-chip-bar";
import { SaveAsViewPopover } from "@features/dashboard/components/save-as-view-popover";
import { ViewHeader } from "@features/dashboard/components/view-header";
import { useViewState } from "@features/dashboard/hooks/use-view-state";
import { getOrgViewsWithCounts } from "@features/dashboard/server/views.server";
import type { Board, Post, View } from "@features/dashboard/types";
import { CreateFeedbackDialog } from "@features/feedback/components/create-feedback-dialog";
import { getBoards, getEnrichedPosts } from "@features/feedback/server/queries";
import { AppSidebar } from "@features/layout/components/app-sidebar";
import { PostDetailPanel } from "@features/post-detail-panel/components/post-detail-panel";
import { getOrgSegments } from "@features/segmentation/server/service";
import type { Segment } from "@features/segmentation/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { useEffect, useRef, useState } from "react";
import { redirect, useParams } from "react-router";
import { toast } from "sonner";
import { getDb } from "@/db";
import { member, user as userTable } from "@/db/schema";
import type { Route } from "./+types/dashboard";

export function meta() {
  return [{ title: "Requests – Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, org } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const [memberRecord, orgMembers, posts, boardsData, views, segmentList] = await Promise.all([
    db.query.member.findFirst({
      where: and(eq(member.organizationId, org.id), eq(member.userId, session.user.id)),
    }),
    db
      .select({ userId: member.userId, name: userTable.name, image: userTable.image })
      .from(member)
      .innerJoin(userTable, eq(member.userId, userTable.id))
      .where(eq(member.organizationId, org.id)),
    getEnrichedPosts(org.id, session.user.id),
    getBoards(org.id),
    getOrgViewsWithCounts(org.id).catch(() => [] as View[]),
    getOrgSegments(org.id).catch(() => [] as Segment[]),
  ]);

  if (boardsData.boards.length === 0) {
    throw redirect(`/${params.orgSlug}/settings/feedback`);
  }

  return {
    user: session.user,
    isAdmin: memberRecord?.role === "admin",
    usersMap: Object.fromEntries(
      orgMembers.map((m) => [m.userId, { name: m.name, image: m.image }]),
    ),
    posts,
    boards: boardsData.boards,
    views,
    segments: segmentList,
    fetchedAt: Date.now(),
  };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSaveAsPopover, setShowSaveAsPopover] = useState(false);
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
  }, [searchQuery]);

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ["feedback", "all", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/feedback");
      return res.json() as Promise<{ posts: Post[] }>;
    },
    initialData: { posts: loaderData.posts },
    initialDataUpdatedAt: loaderData.fetchedAt,
    staleTime: 30_000,
  });

  const { data: boardsData } = useQuery({
    queryKey: ["boards", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/boards");
      return res.json() as Promise<{ boards: Board[] }>;
    },
    initialData: { boards: loaderData.boards, statusCounts: {}, limit: 2 },
    initialDataUpdatedAt: loaderData.fetchedAt,
    staleTime: 30_000,
  });

  const { data: viewsData } = useQuery({
    queryKey: ["views", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/views");
      return res.json() as Promise<{ views: View[] }>;
    },
    initialData: { views: loaderData.views },
    initialDataUpdatedAt: loaderData.fetchedAt,
    staleTime: 30_000,
  });

  const { data: segmentsData } = useQuery({
    queryKey: ["segments", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/segments");
      return res.json() as Promise<{ segments: Segment[] }>;
    },
    initialData: { segments: loaderData.segments },
    initialDataUpdatedAt: loaderData.fetchedAt,
    staleTime: 60_000,
  });

  const allPosts = postsData?.posts ?? [];
  const boards = boardsData?.boards ?? [];
  const views = viewsData?.views ?? [];
  const segments = segmentsData?.segments ?? [];
  const defaultBoard = boards.find((b) => b.isDefault) ?? boards[0];
  const boardMap = Object.fromEntries(boards.map((b) => [b.id, b]));

  const viewState = useViewState(views, allPosts, debouncedSearch, segments);

  const { mutate: saveViewChanges } = useMutation({
    mutationFn: async ({
      viewId,
      filters,
      sort,
    }: {
      viewId: string;
      filters: object;
      sort: string;
    }) => {
      const res = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "update", viewId, filters, sort }),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["views", orgSlug] });
      viewState.clearRefinements();
      toast.success("View updated");
    },
  });

  const { mutate: createView } = useMutation({
    mutationFn: async ({
      name,
      emoji,
      filters,
      sort,
    }: {
      name: string;
      emoji: string;
      filters: object;
      sort: string;
    }) => {
      const res = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create", name, emoji, filters, sort }),
      });
      return res.json() as Promise<{ view: View }>;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["views", orgSlug] });
      setShowSaveAsPopover(false);
      viewState.clearRefinements();
      viewState.switchView(data.view.id);
      toast.success("View created");
    },
  });

  function handleSaveChanges() {
    if (!viewState.activeView) return;
    const merged = viewState.saveRefinementsToView();
    if (!merged) return;
    saveViewChanges({
      viewId: viewState.activeView.id,
      filters: merged.filters,
      sort: merged.sort,
    });
  }

  function handleSaveAsNew(name: string, emoji: string) {
    const merged = viewState.saveRefinementsToView();
    if (!merged) return;
    createView({ name, emoji, filters: merged.filters, sort: merged.sort });
  }

  const { sortedPosts, activeView, refinements, hasRefinements, effectiveSort } = viewState;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-full">
          <ViewHeader
            activeView={activeView}
            hasRefinements={hasRefinements}
            boardMap={boardMap}
            postCount={sortedPosts.length}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onNewRequest={() => setShowCreate(true)}
          />

          <div className="relative shrink-0">
            <RefineChipBar
              activeView={activeView}
              refinements={refinements}
              effectiveSort={effectiveSort}
              hasRefinements={hasRefinements}
              boards={boards}
              segments={segments}
              onSetRefinement={viewState.setRefinement}
              onClearRefinements={viewState.clearRefinements}
              onSaveChanges={handleSaveChanges}
              onSaveAsNew={() => setShowSaveAsPopover(true)}
            />
            {showSaveAsPopover && (
              <div className="absolute right-0 top-full mt-1 z-50">
                <SaveAsViewPopover
                  defaultName={`${activeView?.name ?? "View"} (refined)`}
                  defaultEmoji={activeView?.emoji ?? "📌"}
                  onSave={handleSaveAsNew}
                  onCancel={() => setShowSaveAsPopover(false)}
                />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto min-w-0">
            {postsLoading ? (
              <div className="divide-y">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="h-11 w-11 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                <div className="text-4xl mb-3">🌤️</div>
                <p className="text-sm font-medium">
                  {hasRefinements || debouncedSearch
                    ? "Nothing matches these filters"
                    : "This view is empty"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasRefinements || debouncedSearch
                    ? "Try removing a filter or clearing your search."
                    : "Pick another view from the sidebar, or submit a new request."}
                </p>
              </div>
            ) : (
              <ListView
                posts={sortedPosts}
                group="none"
                boardMap={boardMap}
                queryKey={["feedback", "all", orgSlug ?? ""]}
                usersMap={loaderData.usersMap}
                onOpen={setSelectedPostId}
              />
            )}
          </div>
        </div>
      </SidebarInset>

      {selectedPostId && orgSlug && (
        <PostDetailPanel
          key={selectedPostId}
          postId={selectedPostId}
          orgSlug={orgSlug}
          onClose={() => setSelectedPostId(null)}
          onDataChange={() => qc.invalidateQueries({ queryKey: ["feedback", "all", orgSlug] })}
          onOpenPost={setSelectedPostId}
        />
      )}

      {showCreate && defaultBoard && (
        <CreateFeedbackDialog
          boardId={defaultBoard.id}
          onClose={() => setShowCreate(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ["feedback", "all"] })}
        />
      )}
    </SidebarProvider>
  );
}
