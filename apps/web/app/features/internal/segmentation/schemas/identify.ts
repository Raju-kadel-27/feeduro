import { z } from "zod";

// A company the user belongs to (Canny-style). `externalId` is the org's own company id.
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
      role: z.string().max(100).optional(),
      companySize: z.number().int().positive().optional(),
      mrr: z.number().int().nonnegative().optional(),
      industry: z.string().max(100).optional(),
      location: z.string().max(100).optional(),
    })
    .catchall(z.unknown())
    .optional(),
  // Companies this user belongs to. Upserted and linked on identify.
  companies: z.array(IdentifyCompanySchema).max(20).optional(),
});

export type IdentifyUserInput = z.infer<typeof IdentifyUserSchema>;
