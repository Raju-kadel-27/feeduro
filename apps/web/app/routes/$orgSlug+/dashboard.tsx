
import { Skeleton } from "@components/ui/skeleton";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { CreateFeedbackDialog } from "@features/feedback/components/internal/create-feedback-dialog";
import { getBoards, getEnrichedPosts } from "@features/feedback/server/queries";
import { getOrgTags } from "@features/feedback/server/tags";
import { FeedbackSearchModal } from "@features/internal/dashboard/components/feedback-search-modal";
import { ListView } from "@features/internal/dashboard/components/list-view";
import { RefineChipBar } from "@features/internal/dashboard/components/refine-chip-bar";
import { useViewState } from "@features/internal/dashboard/hooks/use-view-state";
import { getOrgViews } from "@features/internal/dashboard/server/views";
import type { Board, Category, Post, Tag, View } from "@features/internal/dashboard/types";
import type { Segment } from "@features/internal/segmentation/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { eq } from "drizzle-orm";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

const PostDetailPanel = lazy(() =>
  import("@features/internal/post-detail-panel/components/post-detail-panel").then((m) => ({
    default: m.PostDetailPanel,
  })),
);

import { redirect, useParams } from "react-router";
import { member, user as userTable } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/dashboard";

export function meta() {
  return [{ title: "Requests – Feeduro" }];
}

export function shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate }: Route.ShouldRevalidateArgs) {
  // Filtering is 100% client-side — skip loader re-runs when only search params change
  if (currentUrl.pathname === nextUrl.pathname) return false;
  return defaultShouldRevalidate;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, org } = await requireOrgBySlug(db, request, params.orgSlug);

  // segments and categories are deferred to the client — they're only needed for filter chips,
  // not for initial list render, so they don't belong on the critical path.
  // Views are fetched without counts: useViewState recomputes view counts client-side from
  // the full post list, so the server-side count pass (O(views × posts)) is redundant.
  const [orgMembers, posts, boardsData, views, tagList] =
    await Promise.all([
      db
        .select({ userId: member.userId, name: userTable.name, image: userTable.image, role: member.role })
        .from(member)
        .innerJoin(userTable, eq(member.userId, userTable.id))
        .where(eq(member.organizationId, org.id)),
      getEnrichedPosts(db, org.id, session.user.id),
      getBoards(db, org.id),
      getOrgViews(db, org.id).catch(() => [] as View[]),
      getOrgTags(db, org.id).catch(() => [] as Tag[]),
    ]);

  // Derive isAdmin from the orgMembers result — avoids a separate DB round-trip.
  const currentMember = orgMembers.find((m) => m.userId === session.user.id);

  if (boardsData.boards.length === 0) {
    throw redirect(`/${params.orgSlug}/settings/feedback`);
  }

  return {
    user: session.user,
    isAdmin: currentMember?.role === "admin",
    usersMap: Object.fromEntries(
      orgMembers.map((m) => [m.userId, { name: m.name, image: m.image }]),
    ),
    orgMembers: orgMembers.map((m) => ({ id: m.userId, name: m.name, image: m.image })),
    posts,
    boards: boardsData.boards,
    statusCounts: boardsData.statusCounts,
    boardsLimit: boardsData.limit,
    views,
    tags: tagList,
    fetchedAt: Date.now(),
  };
}

const PAGE_SIZE = 25;

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();

  const {
    data: postsData,
    isLoading: postsLoading,
    isFetching: postsFetching,
    refetch: refetchPosts,
  } = useQuery({
    queryKey: ["feedback", "all", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/feedback");
      return res.json() as Promise<{ posts: Post[]; traitsIncluded?: boolean }>;
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
    initialData: {
      boards: loaderData.boards,
      statusCounts: loaderData.statusCounts,
      limit: loaderData.boardsLimit,
    },
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
    staleTime: 60_000,
  });

  const { data: orgMembersData } = useQuery({
    queryKey: ["org-members", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/org-members");
      return res.json() as Promise<{ orgMembers: Array<{ id: string; name: string | null; image: string | null }> }>;
    },
    initialData: { orgMembers: loaderData.orgMembers },
    initialDataUpdatedAt: loaderData.fetchedAt,
    staleTime: 60_000,
  });

  const allPosts = postsData?.posts ?? [];
  const boards = boardsData?.boards ?? [];
  const views = viewsData?.views ?? [];
  const segments = segmentsData?.segments ?? [];
  const tags = tagsData?.tags ?? [];
  const categories = categoriesData?.categories ?? [];
  const orgMembers = orgMembersData?.orgMembers ?? [];
  const boardMap = useMemo(() => Object.fromEntries(boards.map((b) => [b.id, b])), [boards]);
  const defaultBoard = useMemo(() => boards.find((b) => b.isDefault) ?? boards[0], [boards]);

  // ⌘K / Ctrl+K → search modal; ⌘M / Ctrl+M → new feedback dialog
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.key === "k") { e.preventDefault(); setShowSearch((prev) => !prev); }
      else if (e.key === "m") { e.preventDefault(); setShowCreate(true); }
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

  const filterKey = `${activeViewId}|${effectiveSort}|${JSON.stringify(refinements)}`;

  // Loader posts ship without voterTraitCounts/mrrImpact (their joins are the most
  // expensive part of /api/feedback). Fetch the enriched dataset on demand — only
  // when a segment filter or revenue sort actually needs those fields.
  const needsEnrichedPosts =
    !!refinements.segmentId || !!activeView?.filters?.segmentId || effectiveSort === "revenue";
  const traitsLoaded = postsData?.traitsIncluded === true;
  useEffect(() => {
    if (needsEnrichedPosts && !traitsLoaded && !postsFetching) {
      refetchPosts();
    }
  }, [needsEnrichedPosts, traitsLoaded, postsFetching, refetchPosts]);

  // Reset visible window whenever filters/sort change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filterKey]);

  // Load more when sentinel scrolls into view
  const hasMore = visibleCount < sortedPosts.length;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount((n) => n + PAGE_SIZE); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  const visiblePosts = sortedPosts.slice(0, visibleCount);

  return (
        <>
        <div className={`transition-opacity duration-200 ${selectedPostId ? "opacity-50" : "opacity-100"}`}>
          <div className="sticky top-0 z-10 bg-background">
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
              orgMembers={orgMembers}
              onSwitchView={viewState.switchView}
              onClearView={viewState.clearView}
              onSearchOpen={() => setShowSearch(true)}
              onNewRequest={() => setShowCreate(true)}
              onSetRefinement={viewState.setRefinement}
              onSetRefinements={viewState.setRefinements}
              onClearRefinements={viewState.clearRefinements}
            />
          </div>

          <div className="min-w-0">
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
              <>
                <ListView
                  posts={visiblePosts}
                  group="none"
                  boardMap={boardMap}
                  queryKey={["feedback", "all", orgSlug ?? ""]}
                  usersMap={loaderData.usersMap}
                  onOpen={setSelectedPostId}
                />
                {hasMore && <div ref={sentinelRef} className="h-10" />}
              </>
            )}
          </div>
        </div>

      {selectedPostId && orgSlug && (
        <Suspense>
          <PostDetailPanel
            key={selectedPostId}
            postId={selectedPostId}
            orgSlug={orgSlug}
            segments={segments}
            onClose={() => setSelectedPostId(null)}
            onDataChange={() => qc.invalidateQueries({ queryKey: ["feedback", "all", orgSlug] })}
            onOpenPost={setSelectedPostId}
          />
        </Suspense>
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
