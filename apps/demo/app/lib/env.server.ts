import type { RouterContextProvider } from "react-router";
import { z } from "zod";
import { getBindings } from "../middleware/cloudflare.server";

const EnvSchema = z.object({
  // Required
  FEEDIYO_WIDGET_TOKEN: z.string().min(1, "Widget token required"),
  // Optional — extra tabs on /board
  FEEDIYO_WIDGET_TOKEN_FEATURE: z.string().default(""),
  FEEDIYO_WIDGET_TOKEN_INTEGRATIONS: z.string().default(""),
  FEEDIYO_WIDGET_TOKEN_BUGS: z.string().default(""),
  FEEDIYO_API_KEY: z.string().min(1, "API key required"),
  FEEDIYO_API_URL: z.string().url().default("http://localhost:3000"),
  // Optional — features degrade gracefully when absent
  FEEDIYO_WEBHOOK_SECRET: z.string().default(""),
  FEEDIYO_WIDGET_SIGNING_SECRET: z.string().default(""),
  FEEDIYO_BOARD_PUBLIC_URL: z.string().default(""),
  FEEDIYO_STAGING_API_URL: z.string().default(""),
  FEEDIYO_PROD_API_URL: z.string().default(""),
});

export type Env = z.infer<typeof EnvSchema>;

export function getEnv(context: Readonly<RouterContextProvider>): Env {
  let raw: Record<string, string | undefined>;
  try {
    raw = getBindings(context) as unknown as Record<string, string | undefined>;
  } catch {
    raw = process.env as Record<string, string | undefined>;
  }
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const missing = Object.keys(parsed.error.flatten().fieldErrors).join(", ");
    throw new Error(`Missing env vars: ${missing}\nCopy .env.example to .env and fill in the values.`);
  }
  return parsed.data;
}
