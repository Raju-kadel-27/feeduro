import { decodeCursor, encodeCursor } from "@lib/api/cursor";
import { and, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@feeduro/db";
import { userProfiles } from "@feeduro/db/schema";

export const ListUsersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

const USER_COLS = {
  id: true,
  externalId: true,
  email: true,
  name: true,
  plan: true,
  role: true,
  companySize: true,
  industry: true,
  location: true,
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

function formatProfile(p: {
  id: string; externalId: string | null; email: string; name: string | null;
  plan: string | null; role: string | null; companySize: number | null;
  industry: string | null; location: string | null; customAttributes: string | null;
  createdAt: Date; updatedAt: Date;
}) {
  const { customAttributes, ...rest } = p;
  return { ...rest, customAttributes: parseCustomAttributes(customAttributes) };
}

export async function listUsers(db: Db, organizationId: string, params: z.infer<typeof ListUsersSchema>) {
  const { limit, cursor } = params;
  const cursorDate = cursor ? decodeCursor(cursor) : null;

  const profiles = await db.query.userProfiles.findMany({
    where: and(
      eq(userProfiles.organizationId, organizationId),
      cursorDate ? lt(userProfiles.createdAt, cursorDate) : undefined,
    ),
    columns: USER_COLS,
    orderBy: [desc(userProfiles.createdAt)],
    limit: limit + 1,
  });

  const hasMore = profiles.length > limit;
  const items = hasMore ? profiles.slice(0, limit) : profiles;
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1].createdAt) : undefined;

  return { data: items.map(formatProfile), hasMore, cursor: nextCursor };
}

export async function getUser(db: Db, organizationId: string, profileId: string) {
  const profile = await db.query.userProfiles.findFirst({
    where: and(eq(userProfiles.id, profileId), eq(userProfiles.organizationId, organizationId)),
    columns: USER_COLS,
  });
  return profile ? formatProfile(profile) : null;
}

export async function deleteUser(db: Db, organizationId: string, profileId: string): Promise<boolean> {
  const result = await db
    .delete(userProfiles)
    .where(and(eq(userProfiles.id, profileId), eq(userProfiles.organizationId, organizationId)))
    .returning({ id: userProfiles.id });
  return result.length > 0;
}
