import { z } from "zod";

export const SubscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
  orgSlug: z.string().min(1),
});
export type SubscribeInput = z.infer<typeof SubscribeSchema>;

export const SubscriberSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  subscribedAt: z.coerce.date(),
});
export type Subscriber = z.infer<typeof SubscriberSchema>;
