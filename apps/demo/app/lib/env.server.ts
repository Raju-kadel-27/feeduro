import type { RouterContextProvider } from "react-router";
import { z } from "zod";
import { getBindings } from "../middleware/cloudflare.server";

const EnvSchema = z.object({
  // Required
  BASE_URL: z.string().url().default("http://localhost:3001"),
  // Optional — board embed tokens for /board tabs
  FEEDURO_WIDGET_TOKEN_FEATURE: z.string().default(""),
  FEEDURO_WIDGET_TOKEN_INTEGRATIONS: z.string().default(""),
  FEEDURO_WIDGET_TOKEN_BUGS: z.string().default(""),
  FEEDURO_API_KEY: z.string().min(1, "API key required"),
  FEEDURO_API_URL: z.string().url().default("http://localhost:3000"),
  // Optional — features degrade gracefully when absent
  FEEDURO_WEBHOOK_SECRET: z.string().default(""),
  FEEDURO_WIDGET_SIGNING_SECRET: z.string().default(""),
  FEEDURO_BOARD_PUBLIC_URL: z.string().default(""),
  FEEDURO_STAGING_API_URL: z.string().default(""),
  FEEDURO_PROD_API_URL: z.string().default(""),
  // OAuth integration test
  FEEDURO_OAUTH_CLIENT_ID: z.string().default(""),
  FEEDURO_OAUTH_CLIENT_SECRET: z.string().default(""),
  FEEDURO_OAUTH_REDIRECT_URI: z.string().default("http://localhost:3001/oauth/callback"),
});

export type Env = z.infer<typeof EnvSchema>;

export function getEnv(context: Readonly<RouterContextProvider>): Env {
  let raw: Record<string, string | undefined>;
  try {
    raw = getBindings(context) as unknown as Record<string, string | undefined>;
  } catch {
    raw = process.env as Record<string, string | undefined>;
  }

  if (!raw.FEEDURO_OAUTH_REDIRECT_URI) {
    const baseUrl = raw.BASE_URL ?? "http://localhost:3001";
    raw = { ...raw, FEEDURO_OAUTH_REDIRECT_URI: `${baseUrl}/oauth/callback` };
  }

  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const missing = Object.keys(parsed.error.flatten().fieldErrors).join(", ");
    throw new Error(`Missing env vars: ${missing}\nCopy .env.example to .env and fill in the values.`);
  }
  return parsed.data;
}
