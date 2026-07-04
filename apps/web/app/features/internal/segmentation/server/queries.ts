import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { companies, companyMembers, plans, segments, user, userProfiles, votes } from "@/db/schema";
import type {
  Company,
  CompanyVoter,
  PlanCatalogEntry,
  Segment,
  SegmentFilters,
  VoterTraitCounts,
} from "../types";

export interface VoterProfileRow {
  name: string | null;
  email: string;
  plan: string | null;
  role: string | null;
  industry: string | null;
  location: string | null;
  mrr: number | null;
  votedAt: string;
  /** Populated when the voter belongs to a company — drives MRR badge in the voter list. */
  companyId: string | null;
  companyName: string | null;
  companyMrr: number | null;
}

export async function getOrgSegments(organizationId: string): Promise<Segment[]> {
  const db = getDb();
  const rows = await db.query.segments.findMany({
    where: eq(segments.organizationId, organizationId),
    columns: {
      id: true,
      organizationId: true,
      name: true,
      color: true,
      filters: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return rows.map((r) => ({
    ...r,
    filters: JSON.parse(r.filters) as SegmentFilters,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getOrgPlans(organizationId: string): Promise<PlanCatalogEntry[]> {
  const db = getDb();
  const rows = await db.query.plans.findMany({
    where: eq(plans.organizationId, organizationId),
    columns: {
      id: true,
      organizationId: true,
      name: true,
      monthlyPrice: true,
      interval: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [desc(plans.monthlyPrice)],
  });
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

// A voter's effective MRR is their explicit override, else their plan's catalog price, else 0.
// The catalog is small (a handful of tiers per org) so we resolve in JS off a single fetch.
async function getPlanPriceMap(organizationId: string): Promise<Map<string, number>> {
  const db = getDb();
  try {
    const rows = await db
      .select({ name: plans.name, monthlyPrice: plans.monthlyPrice })
      .from(plans)
      .where(eq(plans.organizationId, organizationId));
    return new Map(rows.map((r) => [r.name, r.monthlyPrice]));
  } catch (err) {
    // Pricing is optional (table may be unmigrated) — degrade to no catalog rather than break callers.
    console.error("getPlanPriceMap failed; treating catalog as empty", err);
    return new Map();
  }
}

function resolveMrr(
  explicit: number | null,
  plan: string | null,
  priceMap: Map<string, number>,
): number {
  if (explicit != null) return explicit;
  if (plan != null) return priceMap.get(plan) ?? 0;
  return 0;
}

export async function getOrgCompanies(organizationId: string): Promise<Company[]> {
  const db = getDb();
  const rows = await db.query.companies.findMany({
    where: eq(companies.organizationId, organizationId),
    columns: {
      id: true,
      organizationId: true,
      externalId: true,
      name: true,
      monthlySpend: true,
      plan: true,
      customAttributes: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [desc(companies.monthlySpend)],
  });
  return rows.map((r) => ({
    ...r,
    customAttributes: (r.customAttributes
      ? JSON.parse(r.customAttributes)
      : {}) as Record<string, unknown>,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

interface CompanyRef {
  companyId: string;
  mrr: number;
}

// profileId → the companies it belongs to, each with effective MRR (monthlySpend, else plan price).
async function getCompanyMembershipMap(
  organizationId: string,
  profileIds: string[],
  priceMap: Map<string, number>,
): Promise<Map<string, CompanyRef[]>> {
  const map = new Map<string, CompanyRef[]>();
  if (profileIds.length === 0) return map;
  const db = getDb();
  let rows: Array<{
    profileId: string;
    companyId: string;
    monthlySpend: number | null;
    plan: string | null;
  }>;
  try {
    rows = await db
      .select({
        profileId: companyMembers.userProfileId,
        companyId: companies.id,
        monthlySpend: companies.monthlySpend,
        plan: companies.plan,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companyMembers.companyId, companies.id))
      .where(
        and(
          eq(companyMembers.organizationId, organizationId),
          inArray(companyMembers.userProfileId, profileIds),
        ),
      );
  } catch (err) {
    // Companies are optional (tables may be unmigrated) — fall back to no memberships so callers
    // (segment breakdown, MRR impact) still render with per-user MRR instead of failing.
    console.error("getCompanyMembershipMap failed; treating voters as accountless", err);
    return map;
  }
  for (const r of rows) {
    const mrr = r.monthlySpend ?? (r.plan != null ? (priceMap.get(r.plan) ?? 0) : 0);
    const arr = map.get(r.profileId) ?? [];
    arr.push({ companyId: r.companyId, mrr });
    map.set(r.profileId, arr);
  }
  return map;
}

// Native votes (userId set) are bridged via user.email → userProfiles.email (existing behaviour).
// Imported votes (userProfileId set) are joined directly on userProfiles.id.
// COALESCE merges both sources so callers see one unified profile row per vote.
// The WHERE filter `(nativeProfile.id IS NOT NULL OR importedProfile.id IS NOT NULL)` replicates
// the original INNER JOIN behaviour — votes with no linked profile are excluded.
function voterProfileAliases() {
  return {
    nativeProfile: alias(userProfiles, "native_profile"),
    importedProfile: alias(userProfiles, "imported_profile"),
  };
}

export async function getVoterTraitCountsByPost(
  organizationId: string,
  postIds: string[],
): Promise<Record<string, VoterTraitCounts>> {
  if (postIds.length === 0) return {};
  const db = getDb();
  const { nativeProfile, importedProfile } = voterProfileAliases();

  const rows = await db
    .select({
      postId: votes.postId,
      plan: sql<string | null>`coalesce(${nativeProfile.plan}, ${importedProfile.plan})`,
      role: sql<string | null>`coalesce(${nativeProfile.role}, ${importedProfile.role})`,
      industry: sql<string | null>`coalesce(${nativeProfile.industry}, ${importedProfile.industry})`,
      location: sql<string | null>`coalesce(${nativeProfile.location}, ${importedProfile.location})`,
    })
    .from(votes)
    .leftJoin(user, eq(votes.userId, user.id))
    .leftJoin(
      nativeProfile,
      and(eq(nativeProfile.organizationId, organizationId), eq(nativeProfile.email, user.email)),
    )
    .leftJoin(
      importedProfile,
      and(
        eq(importedProfile.organizationId, organizationId),
        eq(importedProfile.id, votes.userProfileId),
      ),
    )
    .where(
      and(
        eq(votes.organizationId, organizationId),
        inArray(votes.postId, postIds),
        sql`(${nativeProfile.id} IS NOT NULL OR ${importedProfile.id} IS NOT NULL)`,
      ),
    );

  const result: Record<string, VoterTraitCounts> = {};

  function inc(map: Record<string, number>, key: string | null) {
    if (key) map[key] = (map[key] ?? 0) + 1;
  }

  for (const row of rows) {
    if (!result[row.postId]) {
      result[row.postId] = { plan: {}, role: {}, industry: {}, location: {} };
    }
    const t = result[row.postId];
    inc(t.plan, row.plan);
    inc(t.role, row.role);
    inc(t.industry, row.industry);
    inc(t.location, row.location);
  }

  return result;
}

export async function getSegmentMemberCounts(
  organizationId: string,
  segmentList: Array<{ id: string; filters: SegmentFilters }>,
): Promise<Record<string, number>> {
  if (segmentList.length === 0) return {};
  const db = getDb();

  // Effective MRR = explicit override, else the plan's catalog price. `plans.name` is unique per
  // org, so the LEFT JOIN matches at most one row and never inflates count(*).
  const effectiveMrr = sql<number>`coalesce(${userProfiles.mrr}, ${plans.monthlyPrice}, 0)`;

  const counts = await Promise.all(
    segmentList.map(async ({ id, filters }) => {
      const conditions = [eq(userProfiles.organizationId, organizationId)];
      if (filters.plan?.length) conditions.push(inArray(userProfiles.plan, filters.plan));
      if (filters.role?.length) conditions.push(inArray(userProfiles.role, filters.role));
      if (filters.industry?.length) conditions.push(inArray(userProfiles.industry, filters.industry));
      if (filters.location?.length) conditions.push(inArray(userProfiles.location, filters.location));
      if (filters.minCompanySize != null) conditions.push(gte(userProfiles.companySize, filters.minCompanySize));
      if (filters.maxCompanySize != null) conditions.push(lte(userProfiles.companySize, filters.maxCompanySize));
      if (filters.minMrr != null) conditions.push(gte(effectiveMrr, filters.minMrr));
      if (filters.maxMrr != null) conditions.push(lte(effectiveMrr, filters.maxMrr));

      const [row] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(userProfiles)
        .leftJoin(
          plans,
          and(eq(plans.organizationId, organizationId), eq(plans.name, userProfiles.plan)),
        )
        .where(and(...conditions));

      return { id, count: row?.count ?? 0 };
    }),
  );

  return Object.fromEntries(counts.map(({ id, count }) => [id, count]));
}

export async function getVoterProfilesByPost(
  organizationId: string,
  postId: string,
  limit = 50,
): Promise<VoterProfileRow[]> {
  const db = getDb();
  const { nativeProfile, importedProfile } = voterProfileAliases();

  const rows = await db
    .select({
      profileId: sql<string | null>`coalesce(${nativeProfile.id}, ${importedProfile.id})`,
      name: sql<string | null>`coalesce(${nativeProfile.name}, ${importedProfile.name})`,
      // At least one profile is guaranteed by the WHERE filter, so email is always non-null
      email: sql<string>`coalesce(${nativeProfile.email}, ${importedProfile.email})`,
      plan: sql<string | null>`coalesce(${nativeProfile.plan}, ${importedProfile.plan})`,
      role: sql<string | null>`coalesce(${nativeProfile.role}, ${importedProfile.role})`,
      industry: sql<string | null>`coalesce(${nativeProfile.industry}, ${importedProfile.industry})`,
      location: sql<string | null>`coalesce(${nativeProfile.location}, ${importedProfile.location})`,
      mrr: sql<number | null>`coalesce(${nativeProfile.mrr}, ${importedProfile.mrr})`,
      votedAt: votes.createdAt,
    })
    .from(votes)
    .leftJoin(user, eq(votes.userId, user.id))
    .leftJoin(
      nativeProfile,
      and(eq(nativeProfile.organizationId, organizationId), eq(nativeProfile.email, user.email)),
    )
    .leftJoin(
      importedProfile,
      and(
        eq(importedProfile.organizationId, organizationId),
        eq(importedProfile.id, votes.userProfileId),
      ),
    )
    .where(
      and(
        eq(votes.organizationId, organizationId),
        eq(votes.postId, postId),
        sql`(${nativeProfile.id} IS NOT NULL OR ${importedProfile.id} IS NOT NULL)`,
      ),
    )
    .orderBy(desc(votes.createdAt))
    .limit(limit);

  const profileIds = [
    ...new Set(rows.map((r) => r.profileId).filter((x): x is string => x != null)),
  ];

  // Primary company per voter — powers the company badge in the voter list so the displayed
  // MRR matches the company-deduped total shown in the MRR impact header.
  // Try/catch: tables may not be migrated yet; voter list still renders without company info.
  const primaryCompany = new Map<string, { id: string; name: string | null; mrr: number }>();
  if (profileIds.length > 0) {
    try {
      const priceMap = await getPlanPriceMap(organizationId);
      const memRows = await db
        .select({
          profileId: companyMembers.userProfileId,
          companyId: companies.id,
          name: companies.name,
          monthlySpend: companies.monthlySpend,
          plan: companies.plan,
        })
        .from(companyMembers)
        .innerJoin(companies, eq(companyMembers.companyId, companies.id))
        .where(
          and(
            eq(companyMembers.organizationId, organizationId),
            inArray(companyMembers.userProfileId, profileIds),
          ),
        );
      for (const r of memRows) {
        const mrr = r.monthlySpend ?? (r.plan != null ? (priceMap.get(r.plan) ?? 0) : 0);
        const existing = primaryCompany.get(r.profileId);
        if (!existing || mrr > existing.mrr) {
          primaryCompany.set(r.profileId, { id: r.companyId, name: r.name, mrr });
        }
      }
    } catch {
      // Degrade gracefully — voter list renders without company badges
    }
  }

  return rows.map(({ profileId, votedAt, ...rest }) => {
    const company = profileId != null ? primaryCompany.get(profileId) : undefined;
    return {
      ...rest,
      votedAt: votedAt.toISOString(),
      companyId: company?.id ?? null,
      companyName: company?.name ?? null,
      companyMrr: company != null ? company.mrr : null,
    };
  });
}

export interface SegmentCountsResult {
  segmentCounts: Record<string, number>;
  otherCount: number;
  profiledCount: number;
  /** Effective MRR ($/mo) contributed by each segment's voters on this post. */
  mrrBySegment: Record<string, number>;
  /** MRR from profiled voters matching no segment. */
  otherMrr: number;
  /** Total MRR ($/mo) across all profiled voters on this post. */
  totalMrr: number;
}

export async function getSegmentCountsByPost(
  organizationId: string,
  postId: string,
  segmentList: Array<{ id: string; filters: SegmentFilters }>,
): Promise<SegmentCountsResult> {
  const empty: SegmentCountsResult = {
    segmentCounts: {},
    otherCount: 0,
    profiledCount: 0,
    mrrBySegment: {},
    otherMrr: 0,
    totalMrr: 0,
  };
  if (segmentList.length === 0) return empty;

  const db = getDb();
  const { nativeProfile, importedProfile } = voterProfileAliases();

  const [priceMap, rows] = await Promise.all([
    getPlanPriceMap(organizationId),
    db
      .select({
        profileId: sql<string | null>`coalesce(${nativeProfile.id}, ${importedProfile.id})`,
        plan: sql<string | null>`coalesce(${nativeProfile.plan}, ${importedProfile.plan})`,
        role: sql<string | null>`coalesce(${nativeProfile.role}, ${importedProfile.role})`,
        industry: sql<string | null>`coalesce(${nativeProfile.industry}, ${importedProfile.industry})`,
        location: sql<string | null>`coalesce(${nativeProfile.location}, ${importedProfile.location})`,
        companySize: sql<number | null>`coalesce(${nativeProfile.companySize}, ${importedProfile.companySize})`,
        explicitMrr: sql<number | null>`coalesce(${nativeProfile.mrr}, ${importedProfile.mrr})`,
      })
      .from(votes)
      .leftJoin(user, eq(votes.userId, user.id))
      .leftJoin(
        nativeProfile,
        and(eq(nativeProfile.organizationId, organizationId), eq(nativeProfile.email, user.email)),
      )
      .leftJoin(
        importedProfile,
        and(
          eq(importedProfile.organizationId, organizationId),
          eq(importedProfile.id, votes.userProfileId),
        ),
      )
      .where(
        and(
          eq(votes.organizationId, organizationId),
          eq(votes.postId, postId),
          sql`(${nativeProfile.id} IS NOT NULL OR ${importedProfile.id} IS NOT NULL)`,
        ),
      ),
  ]);

  const profileIds = [
    ...new Set(rows.map((r) => r.profileId).filter((x): x is string => x != null)),
  ];
  const membershipMap = await getCompanyMembershipMap(organizationId, profileIds, priceMap);

  const segmentCounts: Record<string, number> = {};
  const mrrBySegment: Record<string, number> = {};
  let otherCount = 0;
  let otherMrr = 0;
  let totalMrr = 0;

  // Company MRR is deduped: a company counts once for totalMrr and once per bucket (segment/other),
  // even when several of its members vote. Accountless voters contribute their per-user MRR each.
  const globalSeen = new Set<string>();
  const seenByBucket = new Map<string, Set<string>>();
  const bucketSeen = (key: string) => {
    let s = seenByBucket.get(key);
    if (!s) {
      s = new Set<string>();
      seenByBucket.set(key, s);
    }
    return s;
  };

  for (const row of rows) {
    const mrr = resolveMrr(row.explicitMrr, row.plan, priceMap);
    const memberOf = row.profileId ? membershipMap.get(row.profileId) : undefined;

    // Segment membership is decided by the voter's per-user traits (unchanged from Phase 0).
    let matchedId: string | null = null;
    for (const seg of segmentList) {
      const f = seg.filters;
      if (f.plan?.length && !f.plan.includes(row.plan ?? "")) continue;
      if (f.role?.length && !f.role.includes(row.role ?? "")) continue;
      if (f.industry?.length && !f.industry.includes(row.industry ?? "")) continue;
      if (f.location?.length && !f.location.includes(row.location ?? "")) continue;
      if (f.minCompanySize != null && (row.companySize == null || row.companySize < f.minCompanySize)) continue;
      if (f.maxCompanySize != null && (row.companySize == null || row.companySize > f.maxCompanySize)) continue;
      if (f.minMrr != null && mrr < f.minMrr) continue;
      if (f.maxMrr != null && mrr > f.maxMrr) continue;
      matchedId = seg.id;
      break;
    }

    const bucketKey = matchedId ?? "__other__";
    if (matchedId) segmentCounts[matchedId] = (segmentCounts[matchedId] ?? 0) + 1;
    else otherCount++;

    const addToBucket = (amount: number) => {
      if (matchedId) mrrBySegment[matchedId] = (mrrBySegment[matchedId] ?? 0) + amount;
      else otherMrr += amount;
    };

    if (memberOf?.length) {
      const seen = bucketSeen(bucketKey);
      for (const c of memberOf) {
        if (!globalSeen.has(c.companyId)) {
          globalSeen.add(c.companyId);
          totalMrr += c.mrr;
        }
        if (!seen.has(c.companyId)) {
          seen.add(c.companyId);
          addToBucket(c.mrr);
        }
      }
    } else {
      totalMrr += mrr;
      addToBucket(mrr);
    }
  }

  return { segmentCounts, otherCount, profiledCount: rows.length, mrrBySegment, otherMrr, totalMrr };
}

// Returns the total MRR ($/mo) attributed to each post. Company voters are deduped — a company
// counts once per post no matter how many members voted (Canny-style); accountless voters
// contribute their per-user effective MRR. Includes merged child posts via allRelevantIds.
export async function getMrrImpactByPost(
  organizationId: string,
  postIds: string[],
): Promise<Record<string, number>> {
  if (postIds.length === 0) return {};
  const db = getDb();
  const { nativeProfile, importedProfile } = voterProfileAliases();

  const [priceMap, rows] = await Promise.all([
    getPlanPriceMap(organizationId),
    db
      .select({
        postId: votes.postId,
        profileId: sql<string | null>`coalesce(${nativeProfile.id}, ${importedProfile.id})`,
        plan: sql<string | null>`coalesce(${nativeProfile.plan}, ${importedProfile.plan})`,
        explicitMrr: sql<number | null>`coalesce(${nativeProfile.mrr}, ${importedProfile.mrr})`,
      })
      .from(votes)
      .leftJoin(user, eq(votes.userId, user.id))
      .leftJoin(
        nativeProfile,
        and(eq(nativeProfile.organizationId, organizationId), eq(nativeProfile.email, user.email)),
      )
      .leftJoin(
        importedProfile,
        and(
          eq(importedProfile.organizationId, organizationId),
          eq(importedProfile.id, votes.userProfileId),
        ),
      )
      .where(and(eq(votes.organizationId, organizationId), inArray(votes.postId, postIds))),
  ]);

  const profileIds = [
    ...new Set(rows.map((r) => r.profileId).filter((x): x is string => x != null)),
  ];
  const membershipMap = await getCompanyMembershipMap(organizationId, profileIds, priceMap);

  const result: Record<string, number> = {};
  const seenByPost = new Map<string, Set<string>>();
  for (const row of rows) {
    const memberOf = row.profileId ? membershipMap.get(row.profileId) : undefined;
    if (memberOf?.length) {
      let seen = seenByPost.get(row.postId);
      if (!seen) {
        seen = new Set<string>();
        seenByPost.set(row.postId, seen);
      }
      for (const c of memberOf) {
        if (!seen.has(c.companyId)) {
          seen.add(c.companyId);
          result[row.postId] = (result[row.postId] ?? 0) + c.mrr;
        }
      }
    } else {
      result[row.postId] =
        (result[row.postId] ?? 0) + resolveMrr(row.explicitMrr, row.plan, priceMap);
    }
  }
  return result;
}

// Distinct companies whose members voted on a post — each with effective MRR and voter count.
// Powers the "Companies" list in the post panel. Sorted by MRR desc, then voter count.
export async function getCompanyVotersByPost(
  organizationId: string,
  postId: string,
): Promise<CompanyVoter[]> {
  const db = getDb();
  const { nativeProfile, importedProfile } = voterProfileAliases();

  const voterRows = await db
    .select({
      profileId: sql<string | null>`coalesce(${nativeProfile.id}, ${importedProfile.id})`,
    })
    .from(votes)
    .leftJoin(user, eq(votes.userId, user.id))
    .leftJoin(
      nativeProfile,
      and(eq(nativeProfile.organizationId, organizationId), eq(nativeProfile.email, user.email)),
    )
    .leftJoin(
      importedProfile,
      and(
        eq(importedProfile.organizationId, organizationId),
        eq(importedProfile.id, votes.userProfileId),
      ),
    )
    .where(
      and(
        eq(votes.organizationId, organizationId),
        eq(votes.postId, postId),
        sql`(${nativeProfile.id} IS NOT NULL OR ${importedProfile.id} IS NOT NULL)`,
      ),
    );

  const profileIds = [
    ...new Set(voterRows.map((r) => r.profileId).filter((x): x is string => x != null)),
  ];
  if (profileIds.length === 0) return [];

  const [priceMap, memRows] = await Promise.all([
    getPlanPriceMap(organizationId),
    db
      .select({
        profileId: companyMembers.userProfileId,
        companyId: companies.id,
        name: companies.name,
        monthlySpend: companies.monthlySpend,
        plan: companies.plan,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companyMembers.companyId, companies.id))
      .where(
        and(
          eq(companyMembers.organizationId, organizationId),
          inArray(companyMembers.userProfileId, profileIds),
        ),
      ),
  ]);

  const map = new Map<string, { name: string | null; mrr: number; voters: Set<string> }>();
  for (const r of memRows) {
    let entry = map.get(r.companyId);
    if (!entry) {
      const mrr = r.monthlySpend ?? (r.plan != null ? (priceMap.get(r.plan) ?? 0) : 0);
      entry = { name: r.name, mrr, voters: new Set() };
      map.set(r.companyId, entry);
    }
    entry.voters.add(r.profileId);
  }

  return [...map.entries()]
    .map(([companyId, e]) => ({ companyId, name: e.name, mrr: e.mrr, voterCount: e.voters.size }))
    .sort((a, b) => b.mrr - a.mrr || b.voterCount - a.voterCount);
}
