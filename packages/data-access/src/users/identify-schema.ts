import { z } from "zod";

export const IdentifyCompanySchema = z.object({
  externalId: z.string().min(1).max(255),
  name: z.string().max(255).optional(),
  monthlySpend: z.number().int().nonnegative().optional(),
  plan: z.string().max(100).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export type IdentifyCompanyInput = z.infer<typeof IdentifyCompanySchema>;

export const IdentifyUserSchema = z.object({
  email: z.string().email(),
  externalId: z.string().max(255).optional(),
  name: z.string().max(255).optional(),
  traits: z
    .object({
      plan: z.string().max(100).optional(),
      billingInterval: z.enum(["monthly", "annual"]).optional(),
      mrr: z.number().int().nonnegative().optional(),
      role: z.string().max(100).optional(),
      companySize: z.number().int().positive().optional(),
      industry: z.string().max(100).optional(),
      location: z.string().max(100).optional(),
    })
    .catchall(z.unknown())
    .optional(),
  companies: z.array(IdentifyCompanySchema).max(20).optional(),
});

export type IdentifyUserInput = z.infer<typeof IdentifyUserSchema>;
