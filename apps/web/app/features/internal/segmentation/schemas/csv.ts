import { z } from "zod";
import type { IdentifyUserInput } from "./identify";

// All CSV values arrive as strings from the parser — companySize is coerced to int.
// Empty strings are stripped by the caller before parsing.
export const CsvRowSchema = z
  .object({
    email: z.string().email("Invalid email"),
    externalId: z.string().max(255).optional(),
    name: z.string().max(255).optional(),
    plan: z.string().max(100).optional(),
    role: z.string().max(100).optional(),
    companySize: z.coerce.number().int().positive("Must be a positive integer").optional(),
    // Optional explicit MRR override (whole dollars/mo). When omitted, MRR is derived from `plan`.
    mrr: z.coerce.number().int().nonnegative("Must be a non-negative integer").optional(),
    industry: z.string().max(100).optional(),
    location: z.string().max(100).optional(),
    // Company columns (Canny-style). companyId links the user to a company; companyMrr is that
    // company's MRR (shared across its seats) — distinct from the per-user `mrr` override above.
    companyId: z.string().max(255).optional(),
    companyName: z.string().max(255).optional(),
    companyMrr: z.coerce.number().int().nonnegative("Must be a non-negative integer").optional(),
    companyPlan: z.string().max(100).optional(),
  })
  .passthrough(); // extra columns become customAttributes

export type CsvRow = z.infer<typeof CsvRowSchema>;

export function csvRowToIdentifyInput(row: CsvRow): IdentifyUserInput {
  const {
    email,
    externalId,
    name,
    plan,
    role,
    companySize,
    mrr,
    industry,
    location,
    companyId,
    companyName,
    companyMrr,
    companyPlan,
    ...rest
  } = row;
  return {
    email,
    ...(externalId && { externalId }),
    ...(name && { name }),
    traits: {
      ...(plan && { plan }),
      ...(role && { role }),
      ...(companySize !== undefined && { companySize: companySize as number }),
      ...(mrr !== undefined && { mrr: mrr as number }),
      ...(industry && { industry }),
      ...(location && { location }),
      ...rest,
    },
    ...(companyId && {
      companies: [
        {
          externalId: companyId,
          ...(companyName && { name: companyName }),
          ...(companyMrr !== undefined && { monthlySpend: companyMrr as number }),
          ...(companyPlan && { plan: companyPlan }),
        },
      ],
    }),
  };
}
