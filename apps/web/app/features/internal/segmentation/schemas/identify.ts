import { z } from "zod";

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
});

export type IdentifyUserInput = z.infer<typeof IdentifyUserSchema>;
