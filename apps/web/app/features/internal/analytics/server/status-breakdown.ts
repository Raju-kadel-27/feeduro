import { and, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { feedbackPosts } from "@/db/schema";
import { StatusBreakdownSchema } from "../schemas/analytics";

export async function getStatusBreakdown(db: Db, organizationId: string, boardId?: string) {
  const rows = await db
    .select({
      status: feedbackPosts.status,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(feedbackPosts)
    .where(
      and(
        eq(feedbackPosts.organizationId, organizationId),
        isNull(feedbackPosts.mergedIntoPostId),
        boardId ? eq(feedbackPosts.boardId, boardId) : undefined,
      ),
    )
    .groupBy(feedbackPosts.status)
    .orderBy(feedbackPosts.status);

  return StatusBreakdownSchema.parse(rows);
}
