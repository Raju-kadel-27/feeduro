import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { feedbackPosts, userProfiles, votes } from "@/db/schema";
import { SegmentDemandListSchema } from "../schemas/analytics";

export type SegmentField = "plan" | "role" | "industry" | "companySize";

export async function getSegmentDemand(
  db: Db,
  organizationId: string,
  segmentField: SegmentField,
  segmentValue: string,
  limit = 10,
) {
  const column = {
    plan: userProfiles.plan,
    role: userProfiles.role,
    industry: userProfiles.industry,
    companySize: userProfiles.companySize,
  }[segmentField];

  const rows = await db
    .select({
      postId: feedbackPosts.id,
      postTitle: feedbackPosts.title,
      totalVotes: feedbackPosts.voteCount,
      segmentVotes: sql<number>`cast(count(${votes.id}) filter (
        where ${userProfiles.id} is not null
      ) as int)`,
      segmentLabel: sql<string>`${segmentValue}`,
    })
    .from(feedbackPosts)
    .innerJoin(votes, eq(votes.postId, feedbackPosts.id))
    .leftJoin(
      userProfiles,
      and(
        eq(userProfiles.userId, votes.userId),
        eq(userProfiles.organizationId, organizationId),
        eq(sql`${column}::text`, segmentValue),
      ),
    )
    .where(eq(feedbackPosts.organizationId, organizationId))
    .groupBy(feedbackPosts.id, feedbackPosts.title, feedbackPosts.voteCount)
    .orderBy(desc(sql`count(${votes.id}) filter (where ${userProfiles.id} is not null)`))
    .limit(limit);

  return SegmentDemandListSchema.parse(rows);
}
