import { z } from "zod";

// ─── API response shapes ──────────────────────────────────────────────────────

export const AsanaWorkspaceSchema = z.object({
  gid: z.string(),
  name: z.string(),
});

export const AsanaProjectSchema = z.object({
  gid: z.string(),
  name: z.string(),
});

export const AsanaSectionSchema = z.object({
  gid: z.string(),
  name: z.string(),
});

export const AsanaTaskResultSchema = z.object({
  gid: z.string(),
  name: z.string(),
  url: z.string(),
  sectionGid: z.string().nullable(),
  sectionName: z.string().nullable(),
  completed: z.boolean(),
});

// ─── Settings ─────────────────────────────────────────────────────────────────

export const AsanaStatusMappingSchema = z.object({
  sectionGid: z.string(),
  sectionName: z.string(),
  feediyoStatus: z.string(),
});

export const AsanaSettingsSchema = z.object({
  workspaceGid: z.string().optional(),
  workspaceName: z.string().optional(),
  defaultProjectGid: z.string().optional(),
  defaultProjectName: z.string().optional(),
  autoCreateIssues: z.boolean(),
  webhookGid: z.string().optional(),
  webhookSecret: z.string().optional(),
  statusMappings: z.array(AsanaStatusMappingSchema).optional(),
});

// ─── Action inputs ─────────────────────────────────────────────────────────────

export const AsanaActionSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("list_projects") }),
  z.object({ intent: z.literal("list_sections"), projectGid: z.string().min(1) }),
  z.object({
    intent: z.literal("update_settings"),
    defaultProjectGid: z.string().optional(),
    defaultProjectName: z.string().optional(),
    autoCreateIssues: z.boolean(),
    statusMappings: z.array(AsanaStatusMappingSchema).optional(),
  }),
  z.object({ intent: z.literal("disconnect") }),
  z.object({
    intent: z.literal("create_task"),
    postId: z.string().min(1),
    name: z.string().optional(),
    notes: z.string().optional(),
  }),
  z.object({
    intent: z.literal("link_task"),
    postId: z.string().min(1),
    taskInput: z.string().min(1),
  }),
  z.object({ intent: z.literal("unlink_task"), postId: z.string().min(1) }),
  z.object({ intent: z.literal("search_tasks"), query: z.string().min(1) }),
]);

export type AsanaWorkspace = z.infer<typeof AsanaWorkspaceSchema>;
export type AsanaProject = z.infer<typeof AsanaProjectSchema>;
export type AsanaSection = z.infer<typeof AsanaSectionSchema>;
export type AsanaTaskResult = z.infer<typeof AsanaTaskResultSchema>;
export type AsanaStatusMapping = z.infer<typeof AsanaStatusMappingSchema>;
export type AsanaSettings = z.infer<typeof AsanaSettingsSchema>;
export type AsanaAction = z.infer<typeof AsanaActionSchema>;
