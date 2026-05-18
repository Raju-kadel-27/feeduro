import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { segments, userProfiles } from "@/db/schema";
import type { IdentifyUserInput } from "../schemas/identify";
import type { SegmentFilters } from "../types";

export async function upsertUserProfile(
  organizationId: string,
  input: IdentifyUserInput,
): Promise<string> {
  const db = getDb();
  const { email, externalId, name, traits } = input;
  const { plan, role, companySize, industry, location, ...rest } = traits ?? {};
  const customAttributes = JSON.stringify(rest);

  const existing = await db.query.userProfiles.findFirst({
    where: and(eq(userProfiles.organizationId, organizationId), eq(userProfiles.email, email)),
    columns: { id: true },
  });

  if (existing) {
    await db
      .update(userProfiles)
      .set({
        ...(externalId !== undefined && { externalId }),
        ...(name !== undefined && { name }),
        ...(plan !== undefined && { plan }),
        ...(role !== undefined && { role }),
        ...(companySize !== undefined && { companySize }),
        ...(industry !== undefined && { industry }),
        ...(location !== undefined && { location }),
        customAttributes,
      })
      .where(eq(userProfiles.id, existing.id));
    return existing.id;
  }

  const [row] = await db
    .insert(userProfiles)
    .values({
      organizationId,
      email,
      externalId,
      name,
      plan,
      role,
      companySize,
      industry,
      location,
      customAttributes,
    })
    .returning({ id: userProfiles.id });
  return row.id;
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
