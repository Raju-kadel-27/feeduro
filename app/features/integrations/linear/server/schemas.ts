import { z } from "zod";

// ─── API response shapes ──────────────────────────────────────────────────────

export const LinearWorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const LinearTeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
});

export const LinearStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["triage", "backlog", "unstarted", "started", "completed", "cancelled"]),
  color: z.string(),
});

export const LinearIssueSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  url: z.string(),
  title: z.string(),
  state: z.object({ name: z.string() }),
});

export const LinearWebhookResultSchema = z.object({
  id: z.string(),
  secret: z.string(),
});

// ─── Settings ─────────────────────────────────────────────────────────────────

export const LinearStatusMappingSchema = z.object({
  linearStateId: z.string(),
  linearStateName: z.string(),
  feediyoStatus: z.string(),
});

export const LinearSettingsSchema = z.object({
  workspaceId: z.string().optional(),
  workspaceName: z.string().optional(),
  defaultTeamId: z.string().optional(),
  autoCreateIssues: z.boolean(),
  webhookId: z.string().optional(),
  webhookSecret: z.string().optional(),
  statusMappings: z.array(LinearStatusMappingSchema).optional(),
});

// ─── Action inputs ─────────────────────────────────────────────────────────────

export const LinearActionSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("list_teams") }),
  z.object({
    intent: z.literal("update_settings"),
    defaultTeamId: z.string().optional(),
    autoCreateIssues: z.boolean(),
  }),
  z.object({ intent: z.literal("disconnect") }),
  z.object({ intent: z.literal("list_team_states"), teamId: z.string().min(1) }),
  z.object({
    intent: z.literal("create_issue"),
    postId: z.string().min(1),
    teamId: z.string().optional(),
  }),
  z.object({
    intent: z.literal("link_issue"),
    postId: z.string().min(1),
    issueId: z.string().min(1),
  }),
  z.object({ intent: z.literal("unlink_issue"), postId: z.string().min(1) }),
]);

export type LinearWorkspace = z.infer<typeof LinearWorkspaceSchema>;
export type LinearTeam = z.infer<typeof LinearTeamSchema>;
export type LinearState = z.infer<typeof LinearStateSchema>;
export type LinearIssue = z.infer<typeof LinearIssueSchema>;
export type LinearWebhookResult = z.infer<typeof LinearWebhookResultSchema>;
export type LinearStatusMapping = z.infer<typeof LinearStatusMappingSchema>;
export type LinearSettings = z.infer<typeof LinearSettingsSchema>;
export type LinearAction = z.infer<typeof LinearActionSchema>;
