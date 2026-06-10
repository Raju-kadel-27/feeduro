import { z } from "zod";

// ─── API response shapes ──────────────────────────────────────────────────────

export const ClickupWorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
});

export const ClickupSpaceSchema = z.object({ id: z.string(), name: z.string() });

export const ClickupListSchema = z.object({
  id: z.string(),
  name: z.string(),
  folder: z.string().optional(),
});

export const ClickupStatusSchema = z.object({
  id: z.string(),
  status: z.string(),
  type: z.string(), // "open" | "custom" | "done" | "closed"
  color: z.string().optional(),
});

export const ClickupTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  custom_id: z.string().nullable().optional(),
  status: z.object({ status: z.string(), color: z.string().optional() }),
});

// ─── Settings ─────────────────────────────────────────────────────────────────

export const ClickupStatusMappingSchema = z.object({
  clickupStatus: z.string(),
  feeduroStatus: z.string(),
});

export const ClickupSettingsSchema = z.object({
  workspaceId: z.string().optional(),
  workspaceName: z.string().optional(),
  defaultSpaceId: z.string().optional(),
  defaultListId: z.string().optional(),
  defaultListName: z.string().optional(),
  autoCreateTasks: z.boolean(),
  webhookId: z.string().optional(),
  webhookSecret: z.string().optional(),
  statusMappings: z.array(ClickupStatusMappingSchema).optional(),
});

// ─── Action inputs ─────────────────────────────────────────────────────────────

export const ClickupActionSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("list_workspaces") }),
  z.object({ intent: z.literal("list_spaces"), workspaceId: z.string().min(1) }),
  z.object({ intent: z.literal("list_lists"), spaceId: z.string().min(1) }),
  z.object({ intent: z.literal("list_statuses"), listId: z.string().min(1) }),
  z.object({
    intent: z.literal("update_settings"),
    workspaceId: z.string().optional(),
    workspaceName: z.string().optional(),
    defaultSpaceId: z.string().optional(),
    defaultListId: z.string().optional(),
    defaultListName: z.string().optional(),
    autoCreateTasks: z.boolean(),
    statusMappings: z.array(ClickupStatusMappingSchema).optional(),
  }),
  z.object({ intent: z.literal("disconnect") }),
  z.object({
    intent: z.literal("create_task"),
    postId: z.string().min(1),
    listId: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
  }),
  z.object({ intent: z.literal("link_task"), postId: z.string().min(1), taskId: z.string().min(1) }),
  z.object({ intent: z.literal("unlink_task"), postId: z.string().min(1) }),
  z.object({ intent: z.literal("search_tasks"), query: z.string().min(1) }),
]);

export type ClickupWorkspace = z.infer<typeof ClickupWorkspaceSchema>;
export type ClickupSpace = z.infer<typeof ClickupSpaceSchema>;
export type ClickupList = z.infer<typeof ClickupListSchema>;
export type ClickupStatus = z.infer<typeof ClickupStatusSchema>;
export type ClickupTask = z.infer<typeof ClickupTaskSchema>;
export type ClickupStatusMapping = z.infer<typeof ClickupStatusMappingSchema>;
export type ClickupSettings = z.infer<typeof ClickupSettingsSchema>;
export type ClickupAction = z.infer<typeof ClickupActionSchema>;
