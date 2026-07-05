import { and, eq, gte, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { feedbackPosts, votes } from "@/db/schema";
import type { DateRange } from "../schemas/analytics";
import { VotesOverTimeSchema } from "../schemas/analytics";

function truncSql(range: DateRange) {
  if (range === "7d" || range === "30d") return sql`date_trunc('day', ${votes.createdAt})`;
  if (range === "90d") return sql`date_trunc('week', ${votes.createdAt})`;
  return sql`date_trunc('month', ${votes.createdAt})`;
}

export async function getVotesOverTime(
  db: Db,
  organizationId: string,
  range: DateRange,
  since?: Date,
  boardId?: string,
) {
  const effectiveSince =
    since ??
    (() => {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      return d;
    })();

  const trunc = truncSql(range);

  const query = db
    .select({
      period: sql<string>`${trunc}::date::text`,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(votes)
    .where(
      and(
        eq(votes.organizationId, organizationId),
        gte(votes.createdAt, effectiveSince),
      ),
    );

  // Board filter requires joining posts since votes don't carry boardId
  if (boardId) {
    const rows = await db
      .select({
        period: sql<string>`${trunc}::date::text`,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(votes)
      .innerJoin(feedbackPosts, and(eq(votes.postId, feedbackPosts.id), eq(feedbackPosts.boardId, boardId)))
      .where(
        and(
          eq(votes.organizationId, organizationId),
          gte(votes.createdAt, effectiveSince),
        ),
      )
      .groupBy(trunc)
      .orderBy(trunc);
    return VotesOverTimeSchema.parse(rows);
  }

  const rows = await query.groupBy(trunc).orderBy(trunc);
  return VotesOverTimeSchema.parse(rows);
}
