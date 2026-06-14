import { SUPPORTED_EVENTS } from "@features/internal/webhooks/constants";
import { z } from "zod";

export const VALID_EVENTS = SUPPORTED_EVENTS.map((e) => e.value);
export const MAX_PER_ORG = 10;

const eventsRefine = (evts: string[]) =>
  evts.includes("*") || evts.every((e) => VALID_EVENTS.includes(e));
const eventsMsg = `events must be ["*"] or a subset of: ${VALID_EVENTS.join(", ")}`;

export const CreateWebhookSchema = z.object({
  url: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://"), { message: "URL must use HTTPS" }),
  name: z.string().max(100).optional(),
  events: z.array(z.string()).default(["*"]).refine(eventsRefine, { message: eventsMsg }),
});

export const UpdateWebhookSchema = z
  .object({
    url: z
      .string()
      .url()
      .refine((u) => u.startsWith("https://"), { message: "URL must use HTTPS" })
      .optional(),
    name: z.string().max(100).nullable().optional(),
    events: z.array(z.string()).refine(eventsRefine, { message: eventsMsg }).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.url !== undefined ||
      d.name !== undefined ||
      d.events !== undefined ||
      d.isActive !== undefined,
    { message: "At least one field must be provided" },
  );
