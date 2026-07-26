import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { companies, companyMembers, userProfiles } from "@/db/schema";
import type { IdentifyCompanyInput, IdentifyUserInput } from "./identify-schema";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

function buildProfileValues(organizationId: string, input: IdentifyUserInput) {
  const { email, externalId, name, traits } = input;
  const { plan, billingInterval, mrr, role, companySize, industry, location, ...rest } = traits ?? {};
  return {
    organizationId,
    email,
    ...(externalId !== undefined && { externalId }),
    ...(name !== undefined && { name }),
    ...(plan !== undefined && { plan: plan.trim().toLowerCase() }),
    ...(billingInterval !== undefined && { billingInterval: billingInterval.trim().toLowerCase() }),
    ...(mrr !== undefined && { mrr }),
    ...(role !== undefined && { role: role.trim().toLowerCase() }),
    ...(companySize !== undefined && { companySize }),
    ...(industry !== undefined && { industry: industry.trim().toLowerCase() }),
    ...(location !== undefined && { location: location.trim().toLowerCase() }),
    ...(Object.keys(rest).length > 0 && { customAttributes: JSON.stringify(rest) }),
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
