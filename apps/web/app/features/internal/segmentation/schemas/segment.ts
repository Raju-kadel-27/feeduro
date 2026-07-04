import { z } from "zod";

export const SegmentFiltersSchema = z.object({
  plan: z.array(z.string()).optional(),
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

export const SegmentActionSchema = z.discriminatedUnion("intent", [
  CreateSegmentSchema,
  UpdateSegmentSchema,
  DeleteSegmentSchema,
]);

export type SegmentAction = z.infer<typeof SegmentActionSchema>;
