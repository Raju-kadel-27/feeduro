import { decodeCursor, encodeCursor } from "@lib/api/cursor";
import { and, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { feedbackPosts, postActivities, user } from "@/db/schema";

export const ListStatusChangesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export async function listStatusChanges(
  db: Db,
  organizationId: string,
  postId: string,
  params: z.infer<typeof ListStatusChangesSchema>,
) {
  const post = await db.query.feedbackPosts.findFirst({
    where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!post) return null;

  const cursorDate = params.cursor ? decodeCursor(params.cursor) : null;

  const rows = await db
    .select({
      id: postActivities.id,
      postId: postActivities.postId,
      oldStatus: postActivities.oldValue,
      newStatus: postActivities.newValue,
      changedById: postActivities.userId,
      changedByName: user.name,
      createdAt: postActivities.createdAt,
    })
    .from(postActivities)
    .leftJoin(user, eq(postActivities.userId, user.id))
    .where(
      and(
        eq(postActivities.postId, postId),
        eq(postActivities.organizationId, organizationId),
        eq(postActivities.type, "status_changed"),
        cursorDate ? lt(postActivities.createdAt, cursorDate) : undefined,
      ),
    )
    .orderBy(desc(postActivities.createdAt))
    .limit(params.limit + 1);

  const hasMore = rows.length > params.limit;
  const items = hasMore ? rows.slice(0, params.limit) : rows;

  return {
    data: items,
    hasMore,
    cursor: hasMore ? encodeCursor(items[items.length - 1].createdAt) : null,
  };
}
