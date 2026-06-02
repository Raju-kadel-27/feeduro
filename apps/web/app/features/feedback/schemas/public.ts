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
  authorIsAdmin: z.boolean(),
  voteCount: z.number(),
  commentCount: z.number(),
});
export type PublicPost = z.infer<typeof PublicPostSchema>;

export const PublicBoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  isDefault: z.boolean(),
  anonymizeUsers: z.boolean(),
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
  body: z.string(),
  authorName: z.string(),
  version: z.string().optional(),
  tags: z.array(z.string()).optional(),
  voteCount: z.number().optional(),
  voted: z.boolean().optional(),
  commentCount: z.number().optional(),
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

export const PublicCommentReplySchema = z.object({
  id: z.string(),
  body: z.string(),
  parentId: z.string().nullable(),
  userId: z.string().nullable(),
  createdAt: z.string(),
  authorName: z.string().nullable(),
  authorImage: z.string().nullable(),
});

export const PublicCommentSchema = PublicCommentReplySchema.extend({
  replies: z.array(PublicCommentReplySchema),
});

export type PublicComment = z.infer<typeof PublicCommentSchema>;
