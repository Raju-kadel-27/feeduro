import { CreateFeedbackDialog } from "@features/feedback/components/internal/create-feedback-dialog";
import type { Segment } from "@features/internal/segmentation/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { useViewState } from "../hooks/use-view-state";
import type { Board, Category, DashboardLoaderData, Post, Tag, View } from "../types";
import { DashboardSkeleton, PostListSkeleton } from "./dashboard-skeleton";
import { FeedbackSearchModal } from "./feedback-search-modal";
import { ListView } from "./list-view";
import { RefineChipBar } from "./refine-chip-bar";

const PostDetailPanel = lazy(() =>
	import("@features/internal/post-detail-panel/components/post-detail-panel").then((m) => ({
		default: m.PostDetailPanel,
	})),
);

const PAGE_SIZE = 25;

export function DashboardContent({ data }: { data: DashboardLoaderData }) {
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
		initialData: { posts: data.posts },
		initialDataUpdatedAt: data.fetchedAt,
		staleTime: 30_000,
	});

	const { data: boardsData } = useQuery({
		queryKey: ["boards", orgSlug],
		queryFn: async () => {
			const res = await fetch("/api/boards");
			return res.json() as Promise<{ boards: Board[]; statusCounts: Record<string, number>; limit: number }>;
		},
		initialData: {
			boards: data.boards,
			statusCounts: data.statusCounts,
			limit: data.boardsLimit,
		},
		initialDataUpdatedAt: data.fetchedAt,
		staleTime: 30_000,
	});

	const { data: viewsData } = useQuery({
		queryKey: ["views", orgSlug],
		queryFn: async () => {
			const res = await fetch("/api/views");
			return res.json() as Promise<{ views: View[] }>;
		},
		initialData: { views: data.views },
		initialDataUpdatedAt: data.fetchedAt,
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
		initialData: { tags: data.tags },
		initialDataUpdatedAt: data.fetchedAt,
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
		initialData: { orgMembers: data.orgMembers },
		initialDataUpdatedAt: data.fetchedAt,
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

	const needsEnrichedPosts =
		!!refinements.segmentId || !!activeView?.filters?.segmentId || effectiveSort === "revenue";
	const traitsLoaded = postsData?.traitsIncluded === true;
	useEffect(() => {
		if (needsEnrichedPosts && !traitsLoaded && !postsFetching) {
			refetchPosts();
		}
	}, [needsEnrichedPosts, traitsLoaded, postsFetching, refetchPosts]);

	useEffect(() => {
		setVisibleCount(PAGE_SIZE);
	}, [filterKey]);

	const hasMore = visibleCount < sortedPosts.length;
	useEffect(() => {
		const el = sentinelRef.current;
		if (!el || !hasMore) return;
		const observer = new IntersectionObserver(
			([entry]) => { if (entry?.isIntersecting) setVisibleCount((n) => n + PAGE_SIZE); },
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
						<PostListSkeleton />
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
								usersMap={data.usersMap}
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
