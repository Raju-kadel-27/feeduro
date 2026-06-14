import { z } from "zod";

export const DuplicateDetectionResultSchema = z.object({
  isDuplicate: z.boolean(),
  matchedPostId: z.string().nullable(),
  confidence: z.enum(["low", "medium", "high"]),
  reason: z.string(),
});

export const ResolveAutopilotSuggestionSchema = z.object({
  intent: z.enum(["approve", "dismiss"]),
  suggestionId: z.string().min(1),
});
