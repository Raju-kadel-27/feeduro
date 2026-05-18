import { z } from "zod";

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

export type VoteTrends = z.infer<typeof VoteTrendsSchema>;
export type VoteTrendPoint = z.infer<typeof VoteTrendPointSchema>;
export type StatusFunnelStep = z.infer<typeof StatusFunnelStepSchema>;
export type StatusFunnel = z.infer<typeof StatusFunnelSchema>;
export type Contributor = z.infer<typeof ContributorSchema>;
export type ContributorRank = z.infer<typeof ContributorRankSchema>;
export type BoardSummary = z.infer<typeof BoardSummarySchema>;
export type SegmentDemand = z.infer<typeof SegmentDemandSchema>;
export type SegmentDemandList = z.infer<typeof SegmentDemandListSchema>;
