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
  EMAIL_SERVER: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  DODO_PAYMENTS_API_KEY: z.string().optional(),
  DODO_PAYMENTS_WEBHOOK_SECRET: z.string().optional(),
  DODO_STARTER_MONTHLY_PRODUCT_ID: z.string().optional(),
  DODO_STARTER_ANNUAL_PRODUCT_ID: z.string().optional(),
  DODO_PRO_MONTHLY_PRODUCT_ID: z.string().optional(),
  DODO_PRO_ANNUAL_PRODUCT_ID: z.string().optional(),
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
