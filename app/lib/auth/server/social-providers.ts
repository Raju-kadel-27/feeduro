import { getEnv } from "@utils/get-env";

const env = getEnv();

export const socialProviders = {
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    prompt: "select_account" as const,
  },
  ...(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET
    ? {
        discord: {
          clientId: env.DISCORD_CLIENT_ID as string,
          clientSecret: env.DISCORD_CLIENT_SECRET as string,
        },
      }
    : {}),
  ...(env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET
    ? {
        slack: {
          clientId: env.SLACK_CLIENT_ID as string,
          clientSecret: env.SLACK_CLIENT_SECRET as string,
        },
      }
    : {}),
};
