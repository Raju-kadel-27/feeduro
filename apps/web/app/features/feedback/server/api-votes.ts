import { and, desc, eq, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { decodeCursor, encodeCursor } from "@lib/api/cursor";
import { getDb } from "@/db";
import { user, userProfiles, votes } from "@/db/schema";

export const ListVotesSchema = z.object({
  postId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export async function listVotes(organizationId: string, params: z.infer<typeof ListVotesSchema>) {
  const db = getDb();
  const { postId, limit, cursor } = params;
  const cursorDate = cursor ? decodeCursor(cursor) : null;

  const rows = await db
    .select({
      id: votes.id,
      postId: votes.postId,
      userId: votes.userId,
      userProfileId: votes.userProfileId,
      createdAt: votes.createdAt,
      // Coalesce: native vote → user table; imported vote → userProfiles table
      voterName: sql<string | null>`coalesce(${user.name}, ${userProfiles.name})`,
      voterEmail: sql<string | null>`coalesce(${user.email}, ${userProfiles.email})`,
    })
    .from(votes)
    .leftJoin(user, eq(votes.userId, user.id))
    .leftJoin(
      userProfiles,
      and(
        eq(userProfiles.organizationId, organizationId),
        eq(userProfiles.id, votes.userProfileId),
      ),
    )
    .where(
      and(
        eq(votes.organizationId, organizationId),
        postId ? eq(votes.postId, postId) : undefined,
        cursorDate ? lt(votes.createdAt, cursorDate) : undefined,
      ),
    )
    .orderBy(desc(votes.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1].createdAt) : undefined;

  return {
    data: items.map((r) => ({
      id: r.id,
      postId: r.postId,
      userId: r.userId,
      userProfileId: r.userProfileId,
      voter: { name: r.voterName, email: r.voterEmail },
      createdAt: r.createdAt,
    })),
    hasMore,
    cursor: nextCursor,
  };
}
