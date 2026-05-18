import { z } from "zod";

export const StatusKeySchema = z.enum([
  "pending",
  "reviewing",
  "planned",
  "inprogress",
  "completed",
  "closed",
]);
export type StatusKey = z.infer<typeof StatusKeySchema>;

export const PublicTabSchema = z.enum(["feedback", "roadmap", "updates"]);
export type PublicTab = z.infer<typeof PublicTabSchema>;

export const AuthTabSchema = z.enum(["sign-in", "sign-up"]);
export type AuthTab = z.infer<typeof AuthTabSchema>;

export const PublicPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: StatusKeySchema,
  boardId: z.string(),
  boardName: z.string(),
  authorName: z.string(),
  voteCount: z.number(),
  commentCount: z.number(),
});
export type PublicPost = z.infer<typeof PublicPostSchema>;

export const PublicBoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  isDefault: z.boolean(),
});
export type PublicBoard = z.infer<typeof PublicBoardSchema>;

export const SessionUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable().optional(),
});
export type SessionUser = z.infer<typeof SessionUserSchema>;

export const PublicChangelogSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  publishedAt: z.string(),
  excerpt: z.string(),
  authorName: z.string(),
});
export type PublicChangelog = z.infer<typeof PublicChangelogSchema>;

export const VoteResponseSchema = z.object({
  voted: z.boolean().optional(),
  voteCount: z.number().optional(),
  error: z.string().optional(),
});

export const FeedbackSubmitResponseSchema = z.object({
  error: z.string().optional(),
  id: z.string().optional(),
});
