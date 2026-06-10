import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { segments, user, userProfiles, votes } from "@/db/schema";
import type { Segment, SegmentFilters, VoterTraitCounts } from "../types";

export interface VoterProfileRow {
  name: string | null;
  email: string;
  plan: string | null;
  role: string | null;
  industry: string | null;
  location: string | null;
  mrr: number | null;
  votedAt: string;
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

  const counts = await Promise.all(
    segmentList.map(async ({ id, filters }) => {
      const conditions = [eq(userProfiles.organizationId, organizationId)];
      if (filters.plan?.length) conditions.push(inArray(userProfiles.plan, filters.plan));
      if (filters.role?.length) conditions.push(inArray(userProfiles.role, filters.role));
      if (filters.industry?.length) conditions.push(inArray(userProfiles.industry, filters.industry));
      if (filters.location?.length) conditions.push(inArray(userProfiles.location, filters.location));
      if (filters.minCompanySize != null) conditions.push(gte(userProfiles.companySize, filters.minCompanySize));
      if (filters.maxCompanySize != null) conditions.push(lte(userProfiles.companySize, filters.maxCompanySize));

      const [row] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(userProfiles)
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

  return rows.map((r) => ({ ...r, votedAt: r.votedAt.toISOString() }));
}

// Returns the total MRR ($/mo) attributed to each post by summing voter MRRs.
// Includes votes from merged child posts when callers pass allRelevantIds.
export async function getMrrImpactByPost(
  organizationId: string,
  postIds: string[],
): Promise<Record<string, number>> {
  if (postIds.length === 0) return {};
  const db = getDb();
  const { nativeProfile, importedProfile } = voterProfileAliases();

  const rows = await db
    .select({
      postId: votes.postId,
      mrr: sql<number>`coalesce(${nativeProfile.mrr}, ${importedProfile.mrr}, 0)`,
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
    .where(and(eq(votes.organizationId, organizationId), inArray(votes.postId, postIds)));

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.postId] = (result[row.postId] ?? 0) + row.mrr;
  }
  return result;
}
