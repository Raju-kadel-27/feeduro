
import { Skeleton } from "@components/ui/skeleton";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { FeedbackSearchModal } from "@features/dashboard/components/feedback-search-modal";
import { ListView } from "@features/dashboard/components/list-view";
import { RefineChipBar } from "@features/dashboard/components/refine-chip-bar";
import { useViewState } from "@features/dashboard/hooks/use-view-state";
import { getOrgViewsWithCounts } from "@features/dashboard/server/views.server";
import { CreateFeedbackDialog } from "@features/feedback/components/create-feedback-dialog";
import { getBoards, getEnrichedPosts } from "@features/feedback/server/queries";
import { getOrgCategories } from "@features/feedback/server/categories.server";
import { getOrgTags } from "@features/feedback/server/tags.server";
import { PostDetailPanel } from "@features/post-detail-panel/components/post-detail-panel";
import { getOrgSegments } from "@features/segmentation/server/service";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { useEffect, useState } from "react";
import { redirect, useParams } from "react-router";
import { getDb } from "@/db";
import { member, user as userTable } from "@/db/schema";
import type { Board, Category, Post, Tag, View } from "@features/dashboard/types";
import type { Segment } from "@features/segmentation/types";
import type { Route } from "./+types/dashboard";

export function meta() {
  return [{ title: "Requests – Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, org } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const [memberRecord, orgMembers, posts, boardsData, views, segmentList, tagList, categoryList] =
    await Promise.all([
      db.query.member.findFirst({
        where: and(eq(member.organizationId, org.id), eq(member.userId, session.user.id)),
      }),
      db
        .select({ userId: member.userId, name: userTable.name, image: userTable.image, role: member.role })
        .from(member)
        .innerJoin(userTable, eq(member.userId, userTable.id))
        .where(eq(member.organizationId, org.id)),
      getEnrichedPosts(org.id, session.user.id),
      getBoards(org.id),
      getOrgViewsWithCounts(org.id).catch(() => [] as View[]),
      getOrgSegments(org.id).catch(() => [] as Segment[]),
      getOrgTags(org.id).catch(() => [] as Tag[]),
      getOrgCategories(org.id).catch(() => [] as Category[]),
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
    orgAdmins: orgMembers
      .filter((m) => m.role === "admin" || m.role === "owner")
      .map((m) => ({ id: m.userId, name: m.name, image: m.image })),
    posts,
    boards: boardsData.boards,
    views,
    segments: segmentList,
    tags: tagList,
    categories: categoryList,
    fetchedAt: Date.now(),
  };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();

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

  const { data: tagsData } = useQuery({
    queryKey: ["tags", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/tags");
      return res.json() as Promise<{ tags: Tag[] }>;
    },
    initialData: { tags: loaderData.tags },
    initialDataUpdatedAt: loaderData.fetchedAt,
    staleTime: 60_000,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      return res.json() as Promise<{ categories: Category[] }>;
    },
    initialData: { categories: loaderData.categories },
    initialDataUpdatedAt: loaderData.fetchedAt,
    staleTime: 60_000,
  });

  const allPosts = postsData?.posts ?? [];
  const boards = boardsData?.boards ?? [];
  const views = viewsData?.views ?? [];
  const segments = segmentsData?.segments ?? [];
  const tags = tagsData?.tags ?? [];
  const categories = categoriesData?.categories ?? [];
  const boardMap = Object.fromEntries(boards.map((b) => [b.id, b]));
  const defaultBoard = boards.find((b) => b.isDefault) ?? boards[0];

  // ⌘K / Ctrl+K opens the search modal
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const viewState = useViewState(views, allPosts, "", segments);

  const {
    sortedPosts,
    activeViewId,
    activeView,
    refinements,
    hasRefinements,
    effectiveSort,
    viewCounts,
  } = viewState;

  return (
        <>
        <div className={`flex flex-col h-full transition-opacity duration-200 ${selectedPostId ? "opacity-50" : "opacity-100"}`}>
          <div className="relative shrink-0">
            <RefineChipBar
              views={views}
              activeViewId={activeViewId}
              activeView={activeView}
              viewCounts={viewCounts}
              refinements={refinements}
              effectiveSort={effectiveSort}
              hasRefinements={hasRefinements}
              boards={boards}
              tags={tags}
              categories={categories}
              segments={segments}
              orgAdmins={loaderData.orgAdmins}
              onSwitchView={viewState.switchView}
              onClearView={viewState.clearView}
              onSearchOpen={() => setShowSearch(true)}
              onNewRequest={() => setShowCreate(true)}
              onSetRefinement={viewState.setRefinement}
              onClearRefinements={viewState.clearRefinements}
            />
          </div>

          <div className="flex-1 overflow-auto min-w-0">
            {postsLoading ? (
              <div className="divide-y">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2">
                    <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
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
                  {hasRefinements ? "Nothing matches these filters" : "This view is empty"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasRefinements
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

      <FeedbackSearchModal
        boards={boards}
        open={showSearch}
        onClose={() => setShowSearch(false)}
        onOpen={setSelectedPostId}
      />
        </>
  );
}
