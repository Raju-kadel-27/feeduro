import { z } from "zod";

const StatusSchema = z.enum(["open", "reviewing", "planned", "in-progress", "completed", "closed"]);
const SortSchema = z.enum(["newest", "oldest", "votes", "trending"]);

export const ViewFiltersFormSchema = z.object({
  status: z.array(StatusSchema).optional(),
  board: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  categoryId: z.array(z.string()).optional(),
  segmentId: z.string().optional(),
  hasCustomerComment: z.boolean().optional(),
  hasComments: z.boolean().optional(),
});

export const ViewFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  emoji: z.string().min(1).max(10).default("📌"),
  sort: SortSchema.default("newest"),
  filters: ViewFiltersFormSchema.default({}),
});

export type ViewFormData = z.infer<typeof ViewFormSchema>;
