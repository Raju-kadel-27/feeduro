import { z } from "zod";

export const ResolutionTimeSchema = z.object({
  avgDays: z.number().nullable(),
  medianDays: z.number().nullable(),
  resolvedCount: z.number(),
});
export type ResolutionTime = z.infer<typeof ResolutionTimeSchema>;

export const ResponseRateSchema = z.object({
  totalPosts: z.number(),
  respondedPosts: z.number(),
  responseRate: z.number().nullable(),
  avgFirstResponseHours: z.number().nullable(),
});
export type ResponseRate = z.infer<typeof ResponseRateSchema>;

export const BacklogAgingSchema = z.object({
  bucket0to7: z.number(),
  bucket8to30: z.number(),
  bucket31to90: z.number(),
  bucket90plus: z.number(),
  total: z.number(),
});
export type BacklogAging = z.infer<typeof BacklogAgingSchema>;

export const MergeRateSchema = z.object({
  totalPosts: z.number(),
  mergedPosts: z.number(),
  mergeRate: z.number().nullable(),
});
export type MergeRate = z.infer<typeof MergeRateSchema>;

export const VoteConversionSchema = z.object({
  uniqueVisitors: z.number(),
  uniqueVoters: z.number(),
  conversionRate: z.number().nullable(),
});
export type VoteConversion = z.infer<typeof VoteConversionSchema>;

export const SubscriberMetricsSchema = z.object({
  activeSubscribers: z.number(),
  newSubscribers: z.number(),
  unsubscribed: z.number(),
  totalSubscribers: z.number(),
});
export type SubscriberMetrics = z.infer<typeof SubscriberMetricsSchema>;
