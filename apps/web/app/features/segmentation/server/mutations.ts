import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { segments, userProfiles } from "@/db/schema";
import type { IdentifyUserInput } from "../schemas/identify";
import type { SegmentFilters } from "../types";

function buildProfileValues(organizationId: string, input: IdentifyUserInput) {
  const { email, externalId, name, traits } = input;
  const { plan, role, companySize, industry, location, ...rest } = traits ?? {};
  return {
    organizationId,
    email,
    ...(externalId !== undefined && { externalId }),
    ...(name !== undefined && { name }),
    ...(plan !== undefined && { plan }),
    ...(role !== undefined && { role }),
    ...(companySize !== undefined && { companySize }),
    ...(industry !== undefined && { industry }),
    ...(location !== undefined && { location }),
    customAttributes: JSON.stringify(rest),
  };
}

export async function upsertUserProfile(
  organizationId: string,
  input: IdentifyUserInput,
): Promise<string> {
  const db = getDb();
  const existing = await db.query.userProfiles.findFirst({
    where: and(eq(userProfiles.organizationId, organizationId), eq(userProfiles.email, input.email)),
    columns: { id: true },
  });

  const values = buildProfileValues(organizationId, input);

  if (existing) {
    await db.update(userProfiles).set(values).where(eq(userProfiles.id, existing.id));
    return existing.id;
  }

  const [row] = await db.insert(userProfiles).values(values).returning({ id: userProfiles.id });
  return row.id;
}

export async function bulkUpsertUserProfiles(
  organizationId: string,
  inputs: IdentifyUserInput[],
): Promise<{ imported: number; updated: number }> {
  if (inputs.length === 0) return { imported: 0, updated: 0 };
  const db = getDb();

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

    if (toInsert.length > 0) {
      await tx.insert(userProfiles).values(toInsert.map((i) => buildProfileValues(organizationId, i)));
    }

    await Promise.all(
      toUpdate.map((i) =>
        tx
          .update(userProfiles)
          .set(buildProfileValues(organizationId, i))
          .where(eq(userProfiles.id, existingMap.get(i.email)!)),
      ),
    );

    return { imported: toInsert.length, updated: toUpdate.length };
  });
}

export async function createSegment(
  organizationId: string,
  name: string,
  color: string,
  filters: SegmentFilters,
): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(segments)
    .values({ organizationId, name, color, filters: JSON.stringify(filters) })
    .returning({ id: segments.id });
  return row.id;
}

export async function updateSegment(
  organizationId: string,
  id: string,
  data: { name?: string; color?: string; filters?: SegmentFilters },
): Promise<void> {
  const db = getDb();
  await db
    .update(segments)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.filters !== undefined && { filters: JSON.stringify(data.filters) }),
    })
    .where(and(eq(segments.id, id), eq(segments.organizationId, organizationId)));
}

export async function deleteSegment(organizationId: string, id: string): Promise<void> {
  const db = getDb();
  await db
    .delete(segments)
    .where(and(eq(segments.id, id), eq(segments.organizationId, organizationId)));
}
