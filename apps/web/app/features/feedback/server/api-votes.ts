import { and, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { decodeCursor, encodeCursor } from "@lib/api/cursor";
import { getDb } from "@/db";
import { user, votes } from "@/db/schema";

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
      createdAt: votes.createdAt,
      voterName: user.name,
      voterEmail: user.email,
    })
    .from(votes)
    .leftJoin(user, eq(votes.userId, user.id))
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
      voter: { name: r.voterName, email: r.voterEmail },
      createdAt: r.createdAt,
    })),
    hasMore,
    cursor: nextCursor,
  };
}
