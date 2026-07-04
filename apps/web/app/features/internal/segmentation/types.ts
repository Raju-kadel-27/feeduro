export interface VoterTraitCounts {
  plan: Record<string, number>;
  role: Record<string, number>;
  industry: Record<string, number>;
  location: Record<string, number>;
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
  industry: string | null;
  location: string | null;
  customAttributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentFilters {
  plan?: string[];
  role?: string[];
  industry?: string[];
  location?: string[];
  minCompanySize?: number;
  maxCompanySize?: number;
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
  if (filters.role?.length && !filters.role.includes(profile.role ?? "")) return false;
  if (filters.industry?.length && !filters.industry.includes(profile.industry ?? "")) return false;
  if (filters.location?.length && !filters.location.includes(profile.location ?? "")) return false;
  if (filters.minCompanySize != null && (profile.companySize ?? 0) < filters.minCompanySize)
    return false;
  if (filters.maxCompanySize != null && (profile.companySize ?? 0) > filters.maxCompanySize)
    return false;
  return true;
}
