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
    industry: z.string().max(100).optional(),
    location: z.string().max(100).optional(),
  })
  .passthrough(); // extra columns become customAttributes

export type CsvRow = z.infer<typeof CsvRowSchema>;

export function csvRowToIdentifyInput(row: CsvRow): IdentifyUserInput {
  const { email, externalId, name, plan, role, companySize, industry, location, ...rest } = row;
  return {
    email,
    ...(externalId && { externalId }),
    ...(name && { name }),
    traits: {
      ...(plan && { plan }),
      ...(role && { role }),
      ...(companySize !== undefined && { companySize: companySize as number }),
      ...(industry && { industry }),
      ...(location && { location }),
      ...rest,
    },
  };
}
