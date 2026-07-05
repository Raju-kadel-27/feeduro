import { and, eq, gte, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { feedbackPosts } from "@/db/schema";
import type { DateRange } from "../schemas/analytics";
import { ActivityOverTimeSchema } from "../schemas/analytics";

function truncSql(range: DateRange, col: typeof feedbackPosts.createdAt) {
  if (range === "7d" || range === "30d") return sql`date_trunc('day', ${col})`;
  if (range === "90d") return sql`date_trunc('week', ${col})`;
  return sql`date_trunc('month', ${col})`;
}

export async function getActivityOverTime(
  db: Db,
  organizationId: string,
  range: DateRange,
  since?: Date,
  boardId?: string,
) {
  // For "all time" cap at 12 months so the chart stays readable
  const effectiveSince =
    since ??
    (() => {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      return d;
    })();

  const col = feedbackPosts.createdAt;
  const trunc = truncSql(range, col);

  const rows = await db
    .select({
      period: sql<string>`${trunc}::date::text`,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(feedbackPosts)
    .where(
      and(
        eq(feedbackPosts.organizationId, organizationId),
        isNull(feedbackPosts.mergedIntoPostId),
        gte(col, effectiveSince),
        boardId ? eq(feedbackPosts.boardId, boardId) : undefined,
      ),
    )
    .groupBy(trunc)
    .orderBy(trunc);

  return ActivityOverTimeSchema.parse(rows);
}
