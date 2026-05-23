import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackPosts } from "@/db/schema";
import { StatusBreakdownSchema } from "../schemas/analytics";

export async function getStatusBreakdown(organizationId: string) {
  const db = getDb();

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
      ),
    )
    .groupBy(feedbackPosts.status)
    .orderBy(feedbackPosts.status);

  return StatusBreakdownSchema.parse(rows);
}
