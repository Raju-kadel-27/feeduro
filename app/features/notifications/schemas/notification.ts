import { z } from "zod";

export const NotificationTypeSchema = z.enum([
  "new_comment",
  "new_post",
  "post_merged",
  "status_changed",
  "mention",
  "vote_milestone",
  "autopilot_duplicate",
]);

export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationMetadataSchema = z.object({
  postTitle: z.string().optional(),
  commentBody: z.string().optional(),
  oldStatus: z.string().optional(),
  newStatus: z.string().optional(),
  voteCount: z.number().optional(),
  actorName: z.string().optional(),
  duplicateOfTitle: z.string().optional(),
  confidence: z.enum(["low", "medium", "high"]).optional(),
});

export type NotificationMetadata = z.infer<typeof NotificationMetadataSchema>;

export const NotificationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  type: NotificationTypeSchema,
  postId: z.string().nullable(),
  actorId: z.string().nullable(),
  metadata: NotificationMetadataSchema.nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
  actorName: z.string().nullable().optional(),
  actorImage: z.string().nullable().optional(),
});

export type Notification = z.infer<typeof NotificationSchema>;

export const VOTE_MILESTONES = [
  5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000,
  1_000_000, 2_500_000, 5_000_000,
] as const;

export function isVoteMilestone(count: number): boolean {
  return (VOTE_MILESTONES as readonly number[]).includes(count);
}
