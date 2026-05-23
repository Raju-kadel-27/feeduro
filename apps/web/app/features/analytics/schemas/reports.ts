import { z } from "zod";

export const TopPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  voteCount: z.number(),
  uniqueCompanies: z.number(),
});
export const TopPostsSchema = z.array(TopPostSchema);
export type TopPost = z.infer<typeof TopPostSchema>;

export const ChangelogEngagementItemSchema = z.object({
  changelogId: z.string(),
  title: z.string(),
  publishedAt: z.string().nullable(),
  totalViews: z.number(),
  uniqueReaders: z.number(),
});
export const ChangelogEngagementSchema = z.array(ChangelogEngagementItemSchema);
export type ChangelogEngagementItem = z.infer<typeof ChangelogEngagementItemSchema>;
export type ChangelogEngagement = z.infer<typeof ChangelogEngagementSchema>;

export const AdminActivityItemSchema = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  role: z.string(),
  postsSubmitted: z.number(),
  votesCast: z.number(),
  commentsLeft: z.number(),
});
export const AdminActivitySchema = z.array(AdminActivityItemSchema);
export type AdminActivityItem = z.infer<typeof AdminActivityItemSchema>;
export type AdminActivity = z.infer<typeof AdminActivitySchema>;

export const CompanyEngagementItemSchema = z.object({
  domain: z.string(),
  userCount: z.number(),
  postsSubmitted: z.number(),
  votesCast: z.number(),
  commentsLeft: z.number(),
  lastActive: z.string().nullable(),
});
export const CompanyEngagementSchema = z.array(CompanyEngagementItemSchema);
export type CompanyEngagementItem = z.infer<typeof CompanyEngagementItemSchema>;
export type CompanyEngagement = z.infer<typeof CompanyEngagementSchema>;
