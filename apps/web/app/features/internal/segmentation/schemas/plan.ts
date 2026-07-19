import { z } from "zod";

// Prices are whole dollars, normalized to monthly — same unit as userProfiles.mrr.
export const CreatePlanSchema = z.object({
  intent: z.literal("create"),
  name: z.string().min(1).max(100),
  monthlyPrice: z.number().int().nonnegative(),
  // Normalized annual price in $/mo (e.g. $960/yr → 80). Optional — omit if no annual pricing.
  annualMonthlyPrice: z.number().int().nonnegative().optional(),
  interval: z.enum(["monthly", "annual"]).optional(),
});

export const UpdatePlanSchema = z.object({
  intent: z.literal("update"),
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  monthlyPrice: z.number().int().nonnegative().optional(),
  annualMonthlyPrice: z.number().int().nonnegative().nullable().optional(),
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
