import { z } from "zod";

// ─── API response shapes ──────────────────────────────────────────────────────

export const ShortcutMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  mention_name: z.string(),
});

export const ShortcutWorkflowStateSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(["unstarted", "started", "done"]),
});

export const ShortcutWorkflowSchema = z.object({
  id: z.number(),
  name: z.string(),
  states: z.array(ShortcutWorkflowStateSchema),
});

export const ShortcutStorySchema = z.object({
  id: z.number(),
  name: z.string(),
  app_url: z.string(),
  workflow_state_id: z.number(),
  workflow_id: z.number(),
});

export const ShortcutWebhookSchema = z.object({
  id: z.string(),
  secret: z.string(),
});

// ─── Settings ─────────────────────────────────────────────────────────────────

export const ShortcutStatusMappingSchema = z.object({
  workflowStateId: z.number(),
  workflowStateName: z.string(),
  feeduroStatus: z.string(),
});

export const ShortcutSettingsSchema = z.object({
  memberId: z.string().optional(),
  memberName: z.string().optional(),
  mentionName: z.string().optional(),
  defaultWorkflowId: z.number().optional(),
  defaultWorkflowName: z.string().optional(),
  defaultWorkflowStateId: z.number().optional(),
  autoCreateStories: z.boolean(),
  webhookId: z.string().optional(),
  webhookSecret: z.string().optional(),
  statusMappings: z.array(ShortcutStatusMappingSchema).optional(),
});

// ─── Action inputs ─────────────────────────────────────────────────────────────

export const ShortcutActionSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("connect"), apiToken: z.string().min(1) }),
  z.object({ intent: z.literal("list_workflows") }),
  z.object({
    intent: z.literal("update_settings"),
    defaultWorkflowId: z.number().optional(),
    defaultWorkflowName: z.string().optional(),
    defaultWorkflowStateId: z.number().optional(),
    autoCreateStories: z.boolean(),
    statusMappings: z.array(ShortcutStatusMappingSchema).optional(),
  }),
  z.object({ intent: z.literal("disconnect") }),
  z.object({
    intent: z.literal("create_story"),
    postId: z.string().min(1),
    workflowStateId: z.number().optional(),
  }),
  z.object({
    intent: z.literal("link_story"),
    postId: z.string().min(1),
    storyId: z.string().min(1),
  }),
  z.object({ intent: z.literal("unlink_story"), postId: z.string().min(1) }),
]);

export type ShortcutMember = z.infer<typeof ShortcutMemberSchema>;
export type ShortcutWorkflowState = z.infer<typeof ShortcutWorkflowStateSchema>;
export type ShortcutWorkflow = z.infer<typeof ShortcutWorkflowSchema>;
export type ShortcutStory = z.infer<typeof ShortcutStorySchema>;
export type ShortcutWebhook = z.infer<typeof ShortcutWebhookSchema>;
export type ShortcutStatusMapping = z.infer<typeof ShortcutStatusMappingSchema>;
export type ShortcutSettings = z.infer<typeof ShortcutSettingsSchema>;
export type ShortcutAction = z.infer<typeof ShortcutActionSchema>;
