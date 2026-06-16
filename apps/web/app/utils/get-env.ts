import z from "zod";

const envSchema = z.object({
  ENVIRONMENT: z.enum(["development", "staging", "production"]),
  BASE_URL: z.string(),
  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
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
});

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
