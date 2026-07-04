import { z } from "zod";

// Companies are created via identify()/CSV; this covers manual edits (e.g. correcting MRR) + removal.
export const UpdateCompanySchema = z.object({
  intent: z.literal("update"),
  id: z.string(),
  name: z.string().max(255).optional(),
  monthlySpend: z.number().int().nonnegative().optional(),
  plan: z.string().max(100).optional(),
});

export const DeleteCompanySchema = z.object({
  intent: z.literal("delete"),
  id: z.string(),
});

export const CompanyActionSchema = z.discriminatedUnion("intent", [
  UpdateCompanySchema,
  DeleteCompanySchema,
]);

export type CompanyAction = z.infer<typeof CompanyActionSchema>;
