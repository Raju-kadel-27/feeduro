import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { companies, companyMembers, plans, segments, userProfiles } from "@/db/schema";
import type { IdentifyCompanyInput, IdentifyUserInput } from "../schemas/identify";
import type { SegmentFilters } from "../types";

// Drizzle transaction handle, derived so helpers can accept it without importing internal types.
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

function buildProfileValues(organizationId: string, input: IdentifyUserInput) {
  const { email, externalId, name, traits } = input;
  const { plan, role, companySize, mrr, industry, location, ...rest } = traits ?? {};
  return {
    organizationId,
    email,
    ...(externalId !== undefined && { externalId }),
    ...(name !== undefined && { name }),
    ...(plan !== undefined && { plan }),
    ...(role !== undefined && { role }),
    ...(companySize !== undefined && { companySize }),
    ...(mrr !== undefined && { mrr }),
    ...(industry !== undefined && { industry }),
    ...(location !== undefined && { location }),
    customAttributes: JSON.stringify(rest),
  };
}

function buildCompanyValues(organizationId: string, c: IdentifyCompanyInput) {
  const { externalId, name, monthlySpend, plan, customFields } = c;
  return {
    organizationId,
    externalId,
    ...(name !== undefined && { name }),
    ...(monthlySpend !== undefined && { monthlySpend }),
    ...(plan !== undefined && { plan }),
    ...(customFields !== undefined && { customAttributes: JSON.stringify(customFields) }),
  };
}

// Upserts each company (by org + externalId) and ensures the profile is a member. Idempotent —
// re-identifying adds new company links without removing prior ones.
async function linkProfileToCompanies(
  tx: Tx,
  organizationId: string,
  profileId: string,
  companyInputs: IdentifyCompanyInput[],
) {
  for (const c of companyInputs) {
    const existing = await tx.query.companies.findFirst({
      where: and(
        eq(companies.organizationId, organizationId),
        eq(companies.externalId, c.externalId),
      ),
      columns: { id: true },
    });
    const values = buildCompanyValues(organizationId, c);
    let companyId: string;
    if (existing) {
      await tx.update(companies).set(values).where(eq(companies.id, existing.id));
      companyId = existing.id;
    } else {
      const [row] = await tx.insert(companies).values(values).returning({ id: companies.id });
      companyId = row.id;
    }
    await tx
      .insert(companyMembers)
      .values({ companyId, userProfileId: profileId, organizationId })
      .onConflictDoNothing();
  }
}

export async function upsertUserProfile(
  db: Db,
  organizationId: string,
  input: IdentifyUserInput,
): Promise<string> {
  return db.transaction(async (tx) => {
    const existing = await tx.query.userProfiles.findFirst({
      where: and(
        eq(userProfiles.organizationId, organizationId),
        eq(userProfiles.email, input.email),
      ),
      columns: { id: true },
    });

    const values = buildProfileValues(organizationId, input);
    let profileId: string;
    if (existing) {
      await tx.update(userProfiles).set(values).where(eq(userProfiles.id, existing.id));
      profileId = existing.id;
    } else {
      const [row] = await tx.insert(userProfiles).values(values).returning({ id: userProfiles.id });
      profileId = row.id;
    }

    if (input.companies?.length) {
      await linkProfileToCompanies(tx, organizationId, profileId, input.companies);
    }
    return profileId;
  });
}

export async function bulkUpsertUserProfiles(
  db: Db,
  organizationId: string,
  inputs: IdentifyUserInput[],
): Promise<{ imported: number; updated: number }> {
  if (inputs.length === 0) return { imported: 0, updated: 0 };

  // Last row wins when the same email appears multiple times in the batch
  const deduped = [...new Map(inputs.map((i) => [i.email, i])).values()];
  const emails = deduped.map((i) => i.email);

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: userProfiles.id, email: userProfiles.email })
      .from(userProfiles)
      .where(and(eq(userProfiles.organizationId, organizationId), inArray(userProfiles.email, emails)));

    const existingMap = new Map(existing.map((r) => [r.email, r.id]));
    const toInsert = deduped.filter((i) => !existingMap.has(i.email));
    const toUpdate = deduped.filter((i) => existingMap.has(i.email));

    // email → profileId for both existing and newly inserted rows, so companies can be linked.
    const emailToId = new Map(existingMap);
    if (toInsert.length > 0) {
      const inserted = await tx
        .insert(userProfiles)
        .values(toInsert.map((i) => buildProfileValues(organizationId, i)))
        .returning({ id: userProfiles.id, email: userProfiles.email });
      for (const r of inserted) emailToId.set(r.email, r.id);
    }

    await Promise.all(
      toUpdate.map((i) =>
        tx
          .update(userProfiles)
          .set(buildProfileValues(organizationId, i))
          .where(eq(userProfiles.id, existingMap.get(i.email)!)),
      ),
    );

    for (const i of deduped) {
      const profileId = i.companies?.length ? emailToId.get(i.email) : undefined;
      if (profileId) await linkProfileToCompanies(tx, organizationId, profileId, i.companies!);
    }

    return { imported: toInsert.length, updated: toUpdate.length };
  });
}

export async function createSegment(
  db: Db,
  organizationId: string,
  name: string,
  color: string,
  filters: SegmentFilters,
): Promise<string> {
  const [row] = await db
    .insert(segments)
    .values({ organizationId, name, color, filters: JSON.stringify(filters) })
    .returning({ id: segments.id });
  return row.id;
}

export async function updateSegment(
  db: Db,
  organizationId: string,
  id: string,
  data: { name?: string; color?: string; filters?: SegmentFilters },
): Promise<void> {
  await db
    .update(segments)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.filters !== undefined && { filters: JSON.stringify(data.filters) }),
    })
    .where(and(eq(segments.id, id), eq(segments.organizationId, organizationId)));
}

export async function deleteSegment(db: Db, organizationId: string, id: string): Promise<void> {
  await db
    .delete(segments)
    .where(and(eq(segments.id, id), eq(segments.organizationId, organizationId)));
}

// ── Plan catalog ─────────────────────────────────────────────────────────────
// `name` is unique per org (matches userProfiles.plan); inserting a duplicate throws.

export async function createPlan(
  db: Db,
  organizationId: string,
  data: { name: string; monthlyPrice: number; interval?: string },
): Promise<string> {
  const [row] = await db
    .insert(plans)
    .values({
      organizationId,
      name: data.name,
      monthlyPrice: data.monthlyPrice,
      ...(data.interval !== undefined && { interval: data.interval }),
    })
    .returning({ id: plans.id });
  return row.id;
}

export async function updatePlan(
  db: Db,
  organizationId: string,
  id: string,
  data: { name?: string; monthlyPrice?: number; interval?: string },
): Promise<void> {
  await db
    .update(plans)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.monthlyPrice !== undefined && { monthlyPrice: data.monthlyPrice }),
      ...(data.interval !== undefined && { interval: data.interval }),
    })
    .where(and(eq(plans.id, id), eq(plans.organizationId, organizationId)));
}

export async function deletePlan(db: Db, organizationId: string, id: string): Promise<void> {
  await db.delete(plans).where(and(eq(plans.id, id), eq(plans.organizationId, organizationId)));
}

// ── Companies ────────────────────────────────────────────────────────────────
// Created via identify()/CSV; these support manual correction + removal from the settings UI.

export async function updateCompany(
  db: Db,
  organizationId: string,
  id: string,
  data: { name?: string; monthlySpend?: number; plan?: string },
): Promise<void> {
  await db
    .update(companies)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.monthlySpend !== undefined && { monthlySpend: data.monthlySpend }),
      ...(data.plan !== undefined && { plan: data.plan }),
    })
    .where(and(eq(companies.id, id), eq(companies.organizationId, organizationId)));
}

export async function deleteCompany(db: Db, organizationId: string, id: string): Promise<void> {
  // company_members rows cascade-delete via the FK.
  await db
    .delete(companies)
    .where(and(eq(companies.id, id), eq(companies.organizationId, organizationId)));
}
