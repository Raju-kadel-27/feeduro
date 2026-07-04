import { z } from "zod";

// Prices are whole dollars, normalized to monthly — same unit as userProfiles.mrr.
export const CreatePlanSchema = z.object({
  intent: z.literal("create"),
  name: z.string().min(1).max(100),
  monthlyPrice: z.number().int().nonnegative(),
  interval: z.enum(["monthly", "annual"]).optional(),
});

export const UpdatePlanSchema = z.object({
  intent: z.literal("update"),
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  monthlyPrice: z.number().int().nonnegative().optional(),
  interval: z.enum(["monthly", "annual"]).optional(),
});

export const DeletePlanSchema = z.object({
  intent: z.literal("delete"),
  id: z.string(),
});

export const PlanActionSchema = z.discriminatedUnion("intent", [
  CreatePlanSchema,
  UpdatePlanSchema,
  DeletePlanSchema,
]);

export type PlanAction = z.infer<typeof PlanActionSchema>;
