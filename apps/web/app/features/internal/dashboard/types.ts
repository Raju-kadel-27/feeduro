import type { VoterTraitCounts } from "@features/internal/segmentation/types";
import { endOfDay, parse } from "date-fns";

export type Status = "open" | "reviewing" | "planned" | "in-progress" | "completed" | "closed";
export type Sort = "trending" | "newest" | "oldest" | "votes" | "revenue";
export type Group = "status" | "board" | "none";
export type ViewMode = "list" | "board";

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Post {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  createdAt: string;
  boardId: string;
  createdBy: string | null;
  ownerId?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
  voteCount: number;
  hasVoted: boolean;
  commentCount: number;
  hasCustomerComment?: boolean;
  /** Total MRR ($/mo) of all voters who voted for this post */
  mrrImpact?: number;
  /** Counts per trait dimension for profiled voters (e.g. { plan: { paying: 3 }, role: { founder: 1 } }) */
  voterTraitCounts?: VoterTraitCounts;
}

export interface Board {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  postCount: number;
}

// ─── Views ────────────────────────────────────────────────────────────────────

export interface ViewFilters {
  status?: Status[];
  excludeStatus?: Status[];
  board?: string[];
  author?: string[];
  owner?: string[];
  categoryId?: string[];
  tagIds?: string[];
  minAge?: number;
  maxAge?: number;
  dateFrom?: string;
  dateTo?: string;
  hasCustomerComment?: boolean;
  hasComments?: boolean;
  /** Filter posts where at least 1 voter belongs to this saved segment */
  segmentId?: string;
}

export interface View {
  id: string;
  name: string;
  emoji: string;
  isSystem: boolean;
  sort: Sort;
  order: number;
  filters: ViewFilters;
  count?: number;
}

/** Session-only state layered on top of the active view */
export interface Refinements {
  board?: string[];
  status?: Status[];
  owner?: string[];
  categoryId?: string[];
  tagIds?: string[];
  datePreset?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: Sort;
  hasCustomerComment?: boolean;
  hasComments?: boolean;
  segmentId?: string;
}

// ─── Filter evaluation ────────────────────────────────────────────────────────

export function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
}

export function datePresetToFilters(preset: string): Pick<ViewFilters, "minAge" | "maxAge"> {
  if (preset === "today") return { maxAge: 0 };
  if (preset === "week") return { maxAge: 7 };
  if (preset === "month") return { maxAge: 30 };
  if (preset === "stale") return { minAge: 14 };
  return {};
}

/** Narrow segment filter shape — only what postMatchesFilters needs. */
export interface ActiveSegmentFilter {
  plan?: string[];
  role?: string[];
  industry?: string[];
  location?: string[];
}

function hasTraitMatch(counts: Record<string, number>, values: string[]): boolean {
  return values.some((v) => (counts[v] ?? 0) > 0);
}

export function postMatchesFilters(
  post: Post,
  filters: ViewFilters,
  segmentFilter?: ActiveSegmentFilter,
): boolean {
  if (filters.status?.length && !filters.status.includes(post.status)) return false;
  if (filters.excludeStatus?.length && filters.excludeStatus.includes(post.status)) return false;
  if (filters.board?.length && !filters.board.includes(post.boardId)) return false;
  if (filters.categoryId?.length) {
    if (!post.categoryId || !filters.categoryId.includes(post.categoryId)) return false;
  }
  if (filters.tagIds?.length) {
    const postTags = post.tagIds ?? [];
    if (!filters.tagIds.some((id) => postTags.includes(id))) return false;
  }
  if (filters.author?.length && (!post.createdBy || !filters.author.includes(post.createdBy)))
    return false;
  if (filters.owner?.length) {
    const matchesUnassigned = filters.owner.includes("unassigned") && !post.ownerId;
    const matchesOwner = post.ownerId != null && filters.owner.includes(post.ownerId);
    if (!matchesUnassigned && !matchesOwner) return false;
  }
  const age = daysSince(post.createdAt);
  if (filters.minAge != null && age < filters.minAge) return false;
  if (filters.maxAge != null && age > filters.maxAge) return false;
  const createdMs = new Date(post.createdAt).getTime();
  if (filters.dateFrom && createdMs < parse(filters.dateFrom, "yyyy-MM-dd", new Date()).getTime()) return false;
  if (filters.dateTo && createdMs > endOfDay(parse(filters.dateTo, "yyyy-MM-dd", new Date())).getTime()) return false;
  if (filters.hasCustomerComment && !post.hasCustomerComment) return false;
  if (filters.hasComments && post.commentCount === 0) return false;

  if (segmentFilter) {
    const t = post.voterTraitCounts;
    if (!t) return false;
    if (segmentFilter.plan?.length && !hasTraitMatch(t.plan, segmentFilter.plan)) return false;
    if (segmentFilter.role?.length && !hasTraitMatch(t.role, segmentFilter.role)) return false;
    if (segmentFilter.industry?.length && !hasTraitMatch(t.industry, segmentFilter.industry))
      return false;
    if (segmentFilter.location?.length && !hasTraitMatch(t.location, segmentFilter.location))
      return false;
  }

  return true;
}

export function mergeFilters(viewFilters: ViewFilters, refinements: Refinements): ViewFilters {
  const merged: ViewFilters = { ...viewFilters };
  if (refinements.board?.length) merged.board = refinements.board;
  if (refinements.status?.length) merged.status = refinements.status;
  if (refinements.owner?.length) merged.owner = refinements.owner;
  if (refinements.categoryId?.length) merged.categoryId = refinements.categoryId;
  if (refinements.tagIds?.length) merged.tagIds = refinements.tagIds;
  if (refinements.datePreset) {
    Object.assign(merged, datePresetToFilters(refinements.datePreset));
    delete merged.dateFrom;
    delete merged.dateTo;
  }
  if (refinements.dateFrom || refinements.dateTo) {
    if (refinements.dateFrom) merged.dateFrom = refinements.dateFrom;
    if (refinements.dateTo) merged.dateTo = refinements.dateTo;
    delete merged.minAge;
    delete merged.maxAge;
  }
  if (refinements.hasCustomerComment != null)
    merged.hasCustomerComment = refinements.hasCustomerComment;
  if (refinements.hasComments != null) merged.hasComments = refinements.hasComments;
  if (refinements.segmentId != null) merged.segmentId = refinements.segmentId;
  return merged;
}
