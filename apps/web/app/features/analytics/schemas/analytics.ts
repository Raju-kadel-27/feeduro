import { z } from "zod";

export const DATE_RANGE_OPTIONS = ["7d", "30d", "90d", "all"] as const;
export type DateRange = (typeof DATE_RANGE_OPTIONS)[number];

export const StatusBreakdownItemSchema = z.object({
  status: z.string(),
  count: z.number(),
});
export const StatusBreakdownSchema = z.array(StatusBreakdownItemSchema);
export type StatusBreakdownItem = z.infer<typeof StatusBreakdownItemSchema>;
export type StatusBreakdown = z.infer<typeof StatusBreakdownSchema>;

export const ActivityPointSchema = z.object({
  period: z.string(),
  count: z.number(),
});
export const ActivityOverTimeSchema = z.array(ActivityPointSchema);
export type ActivityPoint = z.infer<typeof ActivityPointSchema>;
export type ActivityOverTime = z.infer<typeof ActivityOverTimeSchema>;

export const CompletedPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  voteCount: z.number(),
  completedAt: z.string(),
});
export const CompletedPostsSchema = z.array(CompletedPostSchema);
export type CompletedPost = z.infer<typeof CompletedPostSchema>;
export type CompletedPosts = z.infer<typeof CompletedPostsSchema>;

export const TagBreakdownItemSchema = z.object({
  tagName: z.string(),
  tagColor: z.string(),
  postCount: z.number(),
  totalVotes: z.number(),
});
export const TagBreakdownSchema = z.array(TagBreakdownItemSchema);
export type TagBreakdownItem = z.infer<typeof TagBreakdownItemSchema>;
export type TagBreakdown = z.infer<typeof TagBreakdownSchema>;

export const TrendingPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  totalVotes: z.number(),
  votesThisWeek: z.number(),
  votesLastWeek: z.number(),
});
export const TrendingPostsSchema = z.array(TrendingPostSchema);
export type TrendingPost = z.infer<typeof TrendingPostSchema>;
export type TrendingPosts = z.infer<typeof TrendingPostsSchema>;

export const VoteTrendPointSchema = z.object({
  date: z.string(),
  voteCount: z.number(),
});

export const VoteTrendsSchema = z.object({
  postId: z.string(),
  postTitle: z.string(),
  totalVotes: z.number(),
  trend: z.array(VoteTrendPointSchema),
});

export const StatusFunnelStepSchema = z.object({
  fromStatus: z.string(),
  toStatus: z.string(),
  avgDays: z.number(),
  transitionCount: z.number(),
});

export const StatusFunnelSchema = z.array(StatusFunnelStepSchema);

export const ContributorSchema = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  voteCount: z.number(),
  submissionCount: z.number(),
  totalActivity: z.number(),
});

export const ContributorRankSchema = z.array(ContributorSchema);

export const BoardSummarySchema = z.object({
  boardId: z.string(),
  boardName: z.string(),
  totalPosts: z.number(),
  openPosts: z.number(),
  resolvedPosts: z.number(),
  totalVotes: z.number(),
  avgVotesPerPost: z.number(),
  resolutionRate: z.number(),
});

export const SegmentDemandSchema = z.object({
  postId: z.string(),
  postTitle: z.string(),
  totalVotes: z.number(),
  segmentVotes: z.number(),
  segmentLabel: z.string(),
});

export const SegmentDemandListSchema = z.array(SegmentDemandSchema);

export const StatsDeltaSchema = z.object({
  posts: z.number().nullable(),
  votes: z.number().nullable(),
  resolutionRate: z.number().nullable(),
  avgVotesPerPost: z.number().nullable(),
});
export type StatsDelta = z.infer<typeof StatsDeltaSchema>;

export const BoardVisitorPointSchema = z.object({
  period: z.string(),
  uniqueVisitors: z.number(),
  totalViews: z.number(),
});
export const BoardVisitorsSchema = z.array(BoardVisitorPointSchema);
export type BoardVisitorPoint = z.infer<typeof BoardVisitorPointSchema>;
export type BoardVisitors = z.infer<typeof BoardVisitorsSchema>;

export const CommentedPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  commentCount: z.number(),
});
export const CommentsAnalyticsSchema = z.object({
  totalComments: z.number(),
  delta: z.number().nullable(),
  topPosts: z.array(CommentedPostSchema),
});
export type CommentedPost = z.infer<typeof CommentedPostSchema>;
export type CommentsAnalytics = z.infer<typeof CommentsAnalyticsSchema>;

export const UnrespondedPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  voteCount: z.number(),
  daysOpen: z.number(),
});
export const UnrespondedPostsSchema = z.array(UnrespondedPostSchema);
export type UnrespondedPost = z.infer<typeof UnrespondedPostSchema>;
export type UnrespondedPosts = z.infer<typeof UnrespondedPostsSchema>;

export const VotesOverTimeSchema = z.array(ActivityPointSchema);
export type VotesOverTime = z.infer<typeof VotesOverTimeSchema>;

export const StatusChangeEventSchema = z.object({
  postId: z.string(),
  postTitle: z.string(),
  boardName: z.string(),
  fromStatus: z.string().nullable(),
  toStatus: z.string(),
  actorName: z.string().nullable(),
  actorEmail: z.string().nullable(),
  changedAt: z.string(),
});
export const StatusChangeFeedSchema = z.array(StatusChangeEventSchema);
export type StatusChangeEvent = z.infer<typeof StatusChangeEventSchema>;
export type StatusChangeFeed = z.infer<typeof StatusChangeFeedSchema>;

export type VoteTrends = z.infer<typeof VoteTrendsSchema>;
export type VoteTrendPoint = z.infer<typeof VoteTrendPointSchema>;
export type StatusFunnelStep = z.infer<typeof StatusFunnelStepSchema>;
export type StatusFunnel = z.infer<typeof StatusFunnelSchema>;
export type Contributor = z.infer<typeof ContributorSchema>;
export type ContributorRank = z.infer<typeof ContributorRankSchema>;
export type BoardSummary = z.infer<typeof BoardSummarySchema>;
export type SegmentDemand = z.infer<typeof SegmentDemandSchema>;
export type SegmentDemandList = z.infer<typeof SegmentDemandListSchema>;
