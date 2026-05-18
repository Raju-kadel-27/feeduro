import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { segments, user, userProfiles, votes } from "@/db/schema";
import type { SegmentFilters } from "../types";

export interface VoterProfileRow {
  name: string | null;
  email: string;
  plan: string | null;
  role: string | null;
  industry: string | null;
  location: string | null;
}

import type { Segment, VoterTraitCounts } from "../types";

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

export async function getVoterTraitCountsByPost(
  organizationId: string,
  postIds: string[],
): Promise<Record<string, VoterTraitCounts>> {
  if (postIds.length === 0) return {};
  const db = getDb();

  // Single query — one row per (vote × profile). We aggregate the 4 dimensions in JS.
  const rows = await db
    .select({
      postId: votes.postId,
      plan: userProfiles.plan,
      role: userProfiles.role,
      industry: userProfiles.industry,
      location: userProfiles.location,
    })
    .from(votes)
    .innerJoin(user, eq(votes.userId, user.id))
    .innerJoin(
      userProfiles,
      and(eq(userProfiles.organizationId, organizationId), eq(userProfiles.email, user.email)),
    )
    .where(and(eq(votes.organizationId, organizationId), inArray(votes.postId, postIds)));

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

  const profiles = await db
    .select({
      plan: userProfiles.plan,
      role: userProfiles.role,
      industry: userProfiles.industry,
      location: userProfiles.location,
      companySize: userProfiles.companySize,
    })
    .from(userProfiles)
    .where(eq(userProfiles.organizationId, organizationId));

  const counts: Record<string, number> = {};
  for (const seg of segmentList) {
    const f = seg.filters;
    counts[seg.id] = profiles.filter((p) => {
      if (f.plan?.length && !f.plan.includes(p.plan ?? "")) return false;
      if (f.role?.length && !f.role.includes(p.role ?? "")) return false;
      if (f.industry?.length && !f.industry.includes(p.industry ?? "")) return false;
      if (f.location?.length && !f.location.includes(p.location ?? "")) return false;
      if (f.minCompanySize != null && (p.companySize ?? 0) < f.minCompanySize) return false;
      if (f.maxCompanySize != null && (p.companySize ?? 0) > f.maxCompanySize) return false;
      return true;
    }).length;
  }
  return counts;
}

export async function getVoterProfilesByPost(
  organizationId: string,
  postId: string,
  limit = 50,
): Promise<VoterProfileRow[]> {
  const db = getDb();
  return db
    .select({
      name: userProfiles.name,
      email: userProfiles.email,
      plan: userProfiles.plan,
      role: userProfiles.role,
      industry: userProfiles.industry,
      location: userProfiles.location,
    })
    .from(votes)
    .innerJoin(user, eq(votes.userId, user.id))
    .innerJoin(
      userProfiles,
      and(eq(userProfiles.organizationId, organizationId), eq(userProfiles.email, user.email)),
    )
    .where(and(eq(votes.organizationId, organizationId), eq(votes.postId, postId)))
    .limit(limit);
}
