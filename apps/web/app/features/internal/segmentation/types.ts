export interface VoterTraitCounts {
  plan: Record<string, number>;
  role: Record<string, number>;
  industry: Record<string, number>;
  location: Record<string, number>;
  billingInterval: Record<string, number>;
}

export interface UserProfile {
  id: string;
  organizationId: string;
  userId: string | null;
  externalId: string | null;
  email: string;
  name: string | null;
  plan: string | null;
  role: string | null;
  companySize: number | null;
  /** Explicit MRR override in whole dollars. When null, MRR is derived from the plan catalog. */
  mrr: number | null;
  /** 'monthly' | 'annual' — selects which plan catalog price is used. null = treated as monthly. */
  billingInterval: string | null;
  industry: string | null;
  location: string | null;
  customAttributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** A company an org sells to (Canny-style). Users link via companyMembers (many-to-many). */
export interface Company {
  id: string;
  organizationId: string;
  externalId: string;
  name: string | null;
  /** MRR in whole dollars. When null, falls back to the plan catalog price for `plan`. */
  monthlySpend: number | null;
  plan: string | null;
  customAttributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** A company that voted on a post, with its effective MRR and how many of its members voted. */
export interface CompanyVoter {
  companyId: string;
  name: string | null;
  mrr: number;
  voterCount: number;
}

/** A pricing tier an org offers to their customers. `name` matches UserProfile.plan. */
export interface PlanCatalogEntry {
  id: string;
  organizationId: string;
  name: string;
  /** Normalized monthly price in whole dollars — used when billingInterval is 'monthly' or unset. */
  monthlyPrice: number;
  /** Normalized annual price in $/mo (e.g. $960/yr → 80). Used when billingInterval is 'annual'. */
  annualMonthlyPrice: number | null;
  /** Kept for backward compat; no longer drives MRR math. */
  interval: string;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentFilters {
  plan?: string[];
  billingInterval?: string[];
  role?: string[];
  industry?: string[];
  location?: string[];
  minCompanySize?: number;
  maxCompanySize?: number;
  minMrr?: number;
  maxMrr?: number;
}

export interface Segment {
  id: string;
  organizationId: string;
  name: string;
  color: string;
  filters: SegmentFilters;
  createdAt: string;
  updatedAt: string;
  /** Number of identified users matching this segment's filters. Populated by API, absent from loader data. */
  memberCount?: number;
}

export function userMatchesSegment(profile: UserProfile, filters: SegmentFilters): boolean {
  if (filters.plan?.length && !filters.plan.includes(profile.plan ?? "")) return false;
  if (filters.billingInterval?.length && !filters.billingInterval.includes(profile.billingInterval ?? "monthly")) return false;
  if (filters.role?.length && !filters.role.includes(profile.role ?? "")) return false;
  if (filters.industry?.length && !filters.industry.includes(profile.industry ?? "")) return false;
  if (filters.location?.length && !filters.location.includes(profile.location ?? "")) return false;
  if (filters.minCompanySize != null && (profile.companySize ?? 0) < filters.minCompanySize)
    return false;
  if (filters.maxCompanySize != null && (profile.companySize ?? 0) > filters.maxCompanySize)
    return false;
  // profile.mrr must already be the effective MRR (catalog-resolved) when MRR filters are used.
  if (filters.minMrr != null && (profile.mrr ?? 0) < filters.minMrr) return false;
  if (filters.maxMrr != null && (profile.mrr ?? 0) > filters.maxMrr) return false;
  return true;
}
