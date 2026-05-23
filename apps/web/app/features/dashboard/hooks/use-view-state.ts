import type { SegmentFilters } from "@features/segmentation/types";
import { useSearchParams } from "react-router";
import {
  type ActiveSegmentFilter,
  mergeFilters,
  type Post,
  postMatchesFilters,
  type Refinements,
  type Sort,
  type Status,
  type View,
  type ViewFilters,
} from "../types";

function sortPosts(posts: Post[], sort: Sort): Post[] {
  const arr = [...posts];
  if (sort === "newest")
    arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  else if (sort === "oldest")
    arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  else if (sort === "votes") arr.sort((a, b) => b.voteCount - a.voteCount);
  else {
    // trending: age-decayed vote score
    const now = Date.now();
    arr.sort((a, b) => {
      const ageA = (now - new Date(a.createdAt).getTime()) / 3_600_000;
      const ageB = (now - new Date(b.createdAt).getTime()) / 3_600_000;
      return b.voteCount / (ageB + 2) - a.voteCount / (ageA + 2);
    });
  }
  return arr;
}

function buildRefinementsFromParams(sp: URLSearchParams): Refinements {
  const boards = sp.getAll("board").filter(Boolean);
  const statuses = sp.getAll("status") as Status[];
  const owners = sp.getAll("owner").filter(Boolean);
  const categoryIds = sp.getAll("category").filter(Boolean);
  const tagIds = sp.getAll("tag").filter(Boolean);
  const datePreset = sp.get("date") ?? undefined;
  const dateFrom = sp.get("dateFrom") ?? undefined;
  const dateTo = sp.get("dateTo") ?? undefined;
  const sort = (sp.get("sort") as Sort) || undefined;
  const hasCustomerComment = sp.get("cust") === "1" ? true : undefined;
  const hasComments = sp.get("commented") === "1" ? true : undefined;
  const segmentId = sp.get("segment") ?? undefined;
  return {
    ...(boards.length > 0 && { board: boards }),
    ...(statuses.length > 0 && { status: statuses }),
    ...(owners.length > 0 && { owner: owners }),
    ...(categoryIds.length > 0 && { categoryId: categoryIds }),
    ...(tagIds.length > 0 && { tagIds }),
    ...(datePreset && { datePreset }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
    ...(sort && { sort }),
    ...(hasCustomerComment && { hasCustomerComment }),
    ...(hasComments && { hasComments }),
    ...(segmentId && { segmentId }),
  };
}

function hasAnyRefinement(r: Refinements): boolean {
  return !!(
    r.board?.length ||
    r.status?.length ||
    r.owner?.length ||
    r.categoryId?.length ||
    r.tagIds?.length ||
    r.datePreset ||
    r.dateFrom ||
    r.dateTo ||
    r.sort ||
    r.hasCustomerComment ||
    r.hasComments ||
    r.segmentId
  );
}

function resolveActiveSegmentFilter(
  segmentId: string | undefined,
  segments: Array<{ id: string; filters: SegmentFilters }>,
): ActiveSegmentFilter | undefined {
  if (!segmentId) return undefined;
  const seg = segments.find((s) => s.id === segmentId);
  if (!seg) return undefined;
  const { plan, role, industry, location } = seg.filters;
  // Return undefined if all dimensions are empty (segment has no filters)
  if (!plan?.length && !role?.length && !industry?.length && !location?.length) return undefined;
  return { plan, role, industry, location };
}

export function useViewState(
  views: View[],
  allPosts: Post[],
  search = "",
  segments: Array<{ id: string; name: string; color: string; filters: SegmentFilters }> = [],
) {
  const [sp, setSp] = useSearchParams();

  const activeViewId = sp.get("view");
  const activeView = views.find((v) => v.id === activeViewId) ?? views[0];
  const refinements = buildRefinementsFromParams(sp);
  const hasRefinements = hasAnyRefinement(refinements);

  function switchView(viewId: string) {
    setSp({ view: viewId }, { replace: true });
  }

  function setRefinement(key: string, value: string | string[] | boolean | undefined) {
    setSp(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(key);
        if (Array.isArray(value)) {
          for (const v of value) next.append(key, v);
        } else if (value != null && value !== false) {
          next.set(key, value === true ? "1" : String(value));
        }
        return next;
      },
      { replace: true },
    );
  }

  function clearRefinements() {
    setSp(
      (prev) => {
        const next = new URLSearchParams();
        const vid = prev.get("view");
        if (vid) next.set("view", vid);
        return next;
      },
      { replace: true },
    );
  }

  function clearView() {
    setSp(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("view");
        return next;
      },
      { replace: true },
    );
  }

  function saveRefinementsToView() {
    if (!activeView) return;
    const mergedFilters = mergeFilters(activeView.filters, refinements);
    const mergedSort = refinements.sort ?? activeView.sort;
    return { filters: mergedFilters, sort: mergedSort };
  }

  const effectiveFilters: ViewFilters = mergeFilters(activeView?.filters ?? {}, refinements);

  const effectiveSort: Sort = refinements.sort ?? activeView?.sort ?? "newest";

  const activeSegment = segments.find((s) => s.id === refinements.segmentId);

  const segmentFilter = resolveActiveSegmentFilter(effectiveFilters.segmentId, segments);
  let filteredPosts = allPosts.filter((p) =>
    postMatchesFilters(p, effectiveFilters, segmentFilter),
  );
  if (search) {
    const q = search.toLowerCase();
    filteredPosts = filteredPosts.filter(
      (p) => p.title.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q),
    );
  }

  const sortedPosts = sortPosts(filteredPosts, effectiveSort);

  const viewCounts = Object.fromEntries(
    views.map((v) => {
      const sf = resolveActiveSegmentFilter(v.filters.segmentId, segments);
      return [v.id, allPosts.filter((p) => postMatchesFilters(p, v.filters, sf)).length];
    }),
  );

  return {
    activeViewId,
    activeView,
    activeSegment,
    refinements,
    hasRefinements,
    effectiveFilters,
    effectiveSort,
    filteredPosts,
    sortedPosts,
    viewCounts,
    switchView,
    setRefinement,
    clearRefinements,
    clearView,
    saveRefinementsToView,
  };
}
