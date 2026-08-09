import { decodeCursor, encodeCursor } from "@lib/api/cursor";
import { and, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { companies, companyMembers, userProfiles } from "@/db/schema";

export const ListCompaniesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export const UpsertCompanySchema = z.object({
  externalId: z.string().min(1).max(255),
  name: z.string().max(255).optional(),
  monthlySpend: z.number().int().nonnegative().optional(),
  plan: z.string().max(100).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateCompanySchema = z.object({
  name: z.string().max(255).optional(),
  monthlySpend: z.number().int().nonnegative().optional(),
  plan: z.string().max(100).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

const COMPANY_COLS = {
  id: true,
  externalId: true,
  name: true,
  monthlySpend: true,
  plan: true,
  customAttributes: true,
  createdAt: true,
  updatedAt: true,
} as const;

function parseCustomAttributes(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function formatCompany(c: {
  id: string;
  externalId: string;
  name: string | null;
  monthlySpend: number | null;
  plan: string | null;
  customAttributes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { customAttributes, ...rest } = c;
  return { ...rest, customAttributes: parseCustomAttributes(customAttributes) };
}

export async function listCompanies(
  db: Db,
  organizationId: string,
  params: z.infer<typeof ListCompaniesSchema>,
) {
  const { limit, cursor } = params;
  const cursorDate = cursor ? decodeCursor(cursor) : null;

  const rows = await db.query.companies.findMany({
    where: and(
      eq(companies.organizationId, organizationId),
      cursorDate ? lt(companies.createdAt, cursorDate) : undefined,
    ),
    columns: COMPANY_COLS,
    orderBy: [desc(companies.createdAt)],
    limit: limit + 1,
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1].createdAt) : undefined;

  return { data: items.map(formatCompany), hasMore, cursor: nextCursor };
}

export async function getCompany(db: Db, organizationId: string, companyId: string) {
  const row = await db.query.companies.findFirst({
    where: and(eq(companies.id, companyId), eq(companies.organizationId, organizationId)),
    columns: COMPANY_COLS,
  });
  return row ? formatCompany(row) : null;
}

export async function upsertCompany(
  db: Db,
  organizationId: string,
  input: z.infer<typeof UpsertCompanySchema>,
): Promise<string> {
  const { externalId, name, monthlySpend, plan, customFields } = input;
  const values = {
    organizationId,
    externalId,
    ...(name !== undefined && { name }),
    ...(monthlySpend !== undefined && { monthlySpend }),
    ...(plan !== undefined && { plan }),
    ...(customFields !== undefined && { customAttributes: JSON.stringify(customFields) }),
  };

  const existing = await db.query.companies.findFirst({
    where: and(eq(companies.organizationId, organizationId), eq(companies.externalId, externalId)),
    columns: { id: true },
  });

  if (existing) {
    await db.update(companies).set(values).where(eq(companies.id, existing.id));
    return existing.id;
  }

  const [row] = await db.insert(companies).values(values).returning({ id: companies.id });
  return row.id;
}

export async function updateCompany(
  db: Db,
  organizationId: string,
  companyId: string,
  input: z.infer<typeof UpdateCompanySchema>,
) {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.monthlySpend !== undefined) patch.monthlySpend = input.monthlySpend;
  if (input.plan !== undefined) patch.plan = input.plan;
  if (input.customFields !== undefined) patch.customAttributes = JSON.stringify(input.customFields);

  if (Object.keys(patch).length > 0) {
    const result = await db
      .update(companies)
      .set(patch)
      .where(and(eq(companies.id, companyId), eq(companies.organizationId, organizationId)))
      .returning({ id: companies.id });
    if (!result.length) return null;
  }

  return getCompany(db, organizationId, companyId);
}

export async function deleteCompany(
  db: Db,
  organizationId: string,
  companyId: string,
): Promise<boolean> {
  const result = await db
    .delete(companies)
    .where(and(eq(companies.id, companyId), eq(companies.organizationId, organizationId)))
    .returning({ id: companies.id });
  return result.length > 0;
}

export type AddMemberResult =
  | { data: { companyId: string; userProfileId: string } }
  | { error: "company_not_found" | "user_not_found" | "already_member" };

export async function addCompanyMember(
  db: Db,
  organizationId: string,
  companyId: string,
  userProfileId: string,
): Promise<AddMemberResult> {
  const [company, user] = await Promise.all([
    db.query.companies.findFirst({
      where: and(eq(companies.id, companyId), eq(companies.organizationId, organizationId)),
      columns: { id: true },
    }),
    db.query.userProfiles.findFirst({
      where: and(eq(userProfiles.id, userProfileId), eq(userProfiles.organizationId, organizationId)),
      columns: { id: true },
    }),
  ]);
  if (!company) return { error: "company_not_found" };
  if (!user) return { error: "user_not_found" };

  const existing = await db.query.companyMembers.findFirst({
    where: and(
      eq(companyMembers.companyId, companyId),
      eq(companyMembers.userProfileId, userProfileId),
    ),
    columns: { companyId: true },
  });
  if (existing) return { error: "already_member" };

  await db.insert(companyMembers).values({ companyId, userProfileId, organizationId });
  return { data: { companyId, userProfileId } };
}

export type RemoveMemberResult =
  | { success: true }
  | { error: "company_not_found" | "not_member" };

export async function removeCompanyMember(
  db: Db,
  organizationId: string,
  companyId: string,
  userProfileId: string,
): Promise<RemoveMemberResult> {
  const company = await db.query.companies.findFirst({
    where: and(eq(companies.id, companyId), eq(companies.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!company) return { error: "company_not_found" };

  const result = await db
    .delete(companyMembers)
    .where(
      and(
        eq(companyMembers.companyId, companyId),
        eq(companyMembers.userProfileId, userProfileId),
        eq(companyMembers.organizationId, organizationId),
      ),
    )
    .returning({ companyId: companyMembers.companyId });

  return result.length > 0 ? { success: true } : { error: "not_member" };
}

export async function listCompanyMembers(
  db: Db,
  organizationId: string,
  companyId: string,
): Promise<
  { id: string; externalId: string | null; email: string; name: string | null; createdAt: Date }[] | null
> {
  const company = await db.query.companies.findFirst({
    where: and(eq(companies.id, companyId), eq(companies.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!company) return null;

  return db
    .select({
      id: userProfiles.id,
      externalId: userProfiles.externalId,
      email: userProfiles.email,
      name: userProfiles.name,
      createdAt: userProfiles.createdAt,
    })
    .from(companyMembers)
    .innerJoin(userProfiles, eq(companyMembers.userProfileId, userProfiles.id))
    .where(
      and(eq(companyMembers.companyId, companyId), eq(companyMembers.organizationId, organizationId)),
    );
}
