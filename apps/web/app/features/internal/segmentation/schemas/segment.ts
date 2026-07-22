import { z } from "zod";

export const SegmentFiltersSchema = z.object({
  plan: z.array(z.string()).optional(),
  billingInterval: z.array(z.enum(["monthly", "annual"])).optional(),
  role: z.array(z.string()).optional(),
  industry: z.array(z.string()).optional(),
  location: z.array(z.string()).optional(),
  minCompanySize: z.number().int().positive().optional(),
  maxCompanySize: z.number().int().positive().optional(),
  minMrr: z.number().int().nonnegative().optional(),
  maxMrr: z.number().int().nonnegative().optional(),
});

export const CreateSegmentSchema = z.object({
  intent: z.literal("create"),
  name: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  filters: SegmentFiltersSchema,
});

export const UpdateSegmentSchema = z.object({
  intent: z.literal("update"),
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  filters: SegmentFiltersSchema.optional(),
});

export const DeleteSegmentSchema = z.object({
  intent: z.literal("delete"),
  id: z.string(),
});

export const SkipWizardSchema = z.object({
  intent: z.literal("skip-wizard"),
});

export const SaveDraftSchema = z.object({
  intent: z.literal("save-draft"),
  draft: z.string(), // JSON-serialised SegmentFormState
});

export const ClearDraftSchema = z.object({
  intent: z.literal("clear-draft"),
});

export const DismissGuideSchema = z.object({
  intent: z.literal("dismiss-guide"),
});

export const SegmentActionSchema = z.discriminatedUnion("intent", [
  CreateSegmentSchema,
  UpdateSegmentSchema,
  DeleteSegmentSchema,
  SkipWizardSchema,
  SaveDraftSchema,
  ClearDraftSchema,
  DismissGuideSchema,
]);

export type SegmentAction = z.infer<typeof SegmentActionSchema>;
