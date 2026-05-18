import { z } from "zod";

// ─── API response shapes ──────────────────────────────────────────────────────

export const JiraCloudResourceSchema = z.object({
  id: z.string(),
  url: z.string(),
  name: z.string(),
});

export const JiraProjectSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
});

export const JiraStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  statusCategory: z.object({ key: z.string(), name: z.string() }),
});

export const JiraIssueResultSchema = z.object({
  id: z.string(),
  key: z.string(),
  url: z.string(),
  summary: z.string(),
  statusName: z.string(),
});

export const JiraWebhookRegistrationSchema = z.object({
  ids: z.array(z.number()),
  expiresAt: z.string(),
});

// ─── Settings ─────────────────────────────────────────────────────────────────

export const JiraStatusMappingSchema = z.object({
  jiraStatusId: z.string(),
  jiraStatusName: z.string(),
  feediyoStatus: z.string(),
});

export const JiraSettingsSchema = z.object({
  cloudId: z.string().optional(),
  cloudUrl: z.string().optional(),
  cloudName: z.string().optional(),
  cloudResources: z.array(JiraCloudResourceSchema).optional(),
  defaultProjectKey: z.string().optional(),
  autoCreateIssues: z.boolean(),
  webhookIds: z.array(z.number()).optional(),
  webhookSecret: z.string().optional(),
  webhookExpiresAt: z.string().optional(),
  statusMappings: z.array(JiraStatusMappingSchema).optional(),
});

// ─── Action inputs ─────────────────────────────────────────────────────────────

export const JiraActionSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("select_cloud"), cloudId: z.string().min(1) }),
  z.object({ intent: z.literal("list_projects") }),
  z.object({ intent: z.literal("list_project_statuses"), projectKey: z.string().min(1) }),
  z.object({
    intent: z.literal("update_settings"),
    defaultProjectKey: z.string().optional(),
    autoCreateIssues: z.boolean(),
    statusMappings: z.array(JiraStatusMappingSchema).optional(),
  }),
  z.object({ intent: z.literal("disconnect") }),
  z.object({
    intent: z.literal("create_issue"),
    postId: z.string().min(1),
    projectKey: z.string().optional(),
  }),
  z.object({
    intent: z.literal("link_issue"),
    postId: z.string().min(1),
    issueKeyOrId: z.string().min(1),
  }),
  z.object({ intent: z.literal("unlink_issue"), postId: z.string().min(1) }),
]);

export type JiraCloudResource = z.infer<typeof JiraCloudResourceSchema>;
export type JiraProject = z.infer<typeof JiraProjectSchema>;
export type JiraStatus = z.infer<typeof JiraStatusSchema>;
export type JiraIssueResult = z.infer<typeof JiraIssueResultSchema>;
export type JiraWebhookRegistration = z.infer<typeof JiraWebhookRegistrationSchema>;
export type JiraStatusMapping = z.infer<typeof JiraStatusMappingSchema>;
export type JiraSettings = z.infer<typeof JiraSettingsSchema>;
export type JiraAction = z.infer<typeof JiraActionSchema>;
