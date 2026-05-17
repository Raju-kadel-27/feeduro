import { z } from "zod";

export const GithubRepoSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  owner: z.object({ login: z.string() }),
  name: z.string(),
  private: z.boolean(),
  html_url: z.string(),
});

export const GithubIssueSchema = z.object({
  number: z.number(),
  html_url: z.string(),
  title: z.string(),
  state: z.string(),
});

export const GithubSettingsSchema = z.object({
  repoOwner: z.string(),
  repoName: z.string(),
  autoCreateIssues: z.boolean(),
  webhookId: z.string().optional(),
  webhookSecret: z.string().optional(),
});

export type GithubRepo = z.infer<typeof GithubRepoSchema>;
export type GithubIssue = z.infer<typeof GithubIssueSchema>;
export type GithubSettings = z.infer<typeof GithubSettingsSchema>;

// ─── Route action inputs ──────────────────────────────────────────────────────

export const GithubActionSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("list_repos") }),
  z.object({
    intent: z.literal("save_repo"),
    repoOwner: z.string().trim().min(1, "Repo owner is required"),
    repoName: z.string().trim().min(1, "Repo name is required"),
    autoCreateIssues: z.boolean().default(false),
  }),
  z.object({
    intent: z.literal("toggle_auto_create"),
    enabled: z.boolean(),
  }),
  z.object({ intent: z.literal("disconnect") }),
  z.object({
    intent: z.literal("create_issue"),
    postId: z.string().min(1, "postId is required"),
  }),
  z.object({
    intent: z.literal("link_issue"),
    postId: z.string().min(1, "postId is required"),
    issueUrl: z.string().trim().min(1, "issueUrl is required"),
  }),
  z.object({
    intent: z.literal("unlink_issue"),
    postId: z.string().min(1, "postId is required"),
  }),
]);

export type GithubAction = z.infer<typeof GithubActionSchema>;
