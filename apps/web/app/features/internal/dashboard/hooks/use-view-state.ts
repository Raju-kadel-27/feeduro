import type { SegmentFilters } from "@features/internal/segmentation/types";
import { useMemo } from "react";
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
  if (sort === "votes") return [...posts].sort((a, b) => b.voteCount - a.voteCount);
  if (sort === "revenue") return [...posts].sort((a, b) => (b.mrrImpact ?? 0) - (a.mrrImpact ?? 0));
  // Pre-compute timestamps once (O(n)) so the sort comparator does only numeric math.
  // Without this, the comparator calls new Date() on every comparison: O(n log n) allocations.
  const withMs = posts.map((p) => ({ p, ms: new Date(p.createdAt).getTime() }));
  if (sort === "newest") withMs.sort((a, b) => b.ms - a.ms);
  else if (sort === "oldest") withMs.sort((a, b) => a.ms - b.ms);
  else {
    // trending: age-decayed vote score
    const now = Date.now();
    withMs.sort((a, b) => {
      const ageA = (now - a.ms) / 3_600_000;
      const ageB = (now - b.ms) / 3_600_000;
      return b.p.voteCount / (ageB + 2) - a.p.voteCount / (ageA + 2);
    });
  }
  return withMs.map(({ p }) => p);
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

  // Stringify the search params so the memo key is a stable primitive.
  // URLSearchParams returns a new object reference on every render, so we can't
  // use sp itself as a dependency.
  const spStr = sp.toString();
  const refinements = useMemo(() => buildRefinementsFromParams(new URLSearchParams(spStr)), [spStr]);
  const hasRefinements = useMemo(() => hasAnyRefinement(refinements), [refinements]);

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

  function setRefinements(updates: Array<[string, string | string[] | boolean | undefined]>) {
    setSp(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of updates) {
          next.delete(key);
          if (Array.isArray(value)) {
            for (const v of value) next.append(key, v);
          } else if (value != null && value !== false) {
            next.set(key, value === true ? "1" : String(value));
          }
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

  const effectiveFilters = useMemo(
    () => mergeFilters(activeView?.filters ?? {}, refinements),
    [activeView, refinements],
  );

  const effectiveSort: Sort = refinements.sort ?? activeView?.sort ?? "newest";

  const activeSegment = segments.find((s) => s.id === refinements.segmentId);

  const segmentFilter = useMemo(
    () => resolveActiveSegmentFilter(effectiveFilters.segmentId, segments),
    [effectiveFilters.segmentId, segments],
  );

  const filteredPosts = useMemo(() => {
    let result = allPosts.filter((p) => postMatchesFilters(p, effectiveFilters, segmentFilter));
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [allPosts, effectiveFilters, segmentFilter, search]);

  const sortedPosts = useMemo(
    () => sortPosts(filteredPosts, effectiveSort),
    [filteredPosts, effectiveSort],
  );

  // viewCounts is computed from allPosts, not from the server's view.count field —
  // this means the client always has accurate counts even before /api/views refreshes.
  const viewCounts = useMemo(
    () =>
      Object.fromEntries(
        views.map((v) => {
          const sf = resolveActiveSegmentFilter(v.filters.segmentId, segments);
          return [v.id, allPosts.filter((p) => postMatchesFilters(p, v.filters, sf)).length];
        }),
      ),
    [views, allPosts, segments],
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
    setRefinements,
    clearRefinements,
    clearView,
    saveRefinementsToView,
  };
}
