import z from "zod";

const envSchema = z.object({
  ENVIRONMENT: z.enum(["development", "staging", "production"]),
  BASE_URL: z.string(),
  // Dual role: drizzle-kit / seed scripts read process.env.DATABASE_URL directly
  // for migrations, AND when set to a direct Neon URL in a deployed env it
  // enables the Neon HTTP read path in entry.worker.ts (see db/index.ts).
  // Optional: without it, all runtime DB access falls back to HYPERDRIVE.
  DATABASE_URL: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  LINEAR_CLIENT_ID: z.string().optional(),
  LINEAR_CLIENT_SECRET: z.string().optional(),
  JIRA_CLIENT_ID: z.string().optional(),
  JIRA_CLIENT_SECRET: z.string().optional(),
  ASANA_CLIENT_ID: z.string().optional(),
  ASANA_CLIENT_SECRET: z.string().optional(),
  NOTION_CLIENT_ID: z.string().optional(),
  NOTION_CLIENT_SECRET: z.string().optional(),
  MONDAY_CLIENT_ID: z.string().optional(),
  MONDAY_CLIENT_SECRET: z.string().optional(),
  TRELLO_API_KEY: z.string().optional(),
  TRELLO_API_SECRET: z.string().optional(),
  ZENDESK_CLIENT_ID: z.string().optional(),
  ZENDESK_CLIENT_SECRET: z.string().optional(),
  HUBSPOT_CLIENT_ID: z.string().optional(),
  HUBSPOT_CLIENT_SECRET: z.string().optional(),
  SALESFORCE_CLIENT_ID: z.string().optional(),
  SALESFORCE_CLIENT_SECRET: z.string().optional(),
  CLICKUP_CLIENT_ID: z.string().optional(),
  CLICKUP_CLIENT_SECRET: z.string().optional(),
  EMAIL_SERVER: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  DODO_PAYMENTS_API_KEY: z.string().optional(),
  DODO_PAYMENTS_WEBHOOK_SECRET: z.string().optional(),
  DODO_STARTER_MONTHLY_PRODUCT_ID: z.string().optional(),
  DODO_STARTER_ANNUAL_PRODUCT_ID: z.string().optional(),
  DODO_PRO_MONTHLY_PRODUCT_ID: z.string().optional(),
  DODO_PRO_ANNUAL_PRODUCT_ID: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  // Comma-separated list of user IDs with platform-admin access (impersonation, admin-users page)
  PLATFORM_ADMIN_USER_IDS: z.string().optional(),
  // tawk.to live chat — set both to enable the widget; omit to disable (e.g. local dev)
  TAWK_PROPERTY_ID: z.string().optional(),
  TAWK_WIDGET_ID: z.string().optional(),
}).refine(
  (data) => !(data.DODO_PAYMENTS_API_KEY && !data.DODO_PAYMENTS_WEBHOOK_SECRET),
  {
    message: "DODO_PAYMENTS_WEBHOOK_SECRET must be set when DODO_PAYMENTS_API_KEY is present — without it, payments will process but subscriptions will never activate",
    path: ["DODO_PAYMENTS_WEBHOOK_SECRET"],
  },
);

export const getEnv = () => {
  if (typeof window !== "undefined") {
    throw new Error("getEnv can only be called on the server");
  }

  const env = envSchema.safeParse(process.env);

  if (!env.success) {
    throw new Error(`Invalid environment variables, ${env.error.message}`);
  }

  return env.data;
};
