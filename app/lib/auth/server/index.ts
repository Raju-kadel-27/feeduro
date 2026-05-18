import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { sso } from "@better-auth/sso";
import { sendResetPasswordEmail } from "@features/jobs/send-reset-password-email";
import { getBaseUrl } from "@utils/base-url";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { lastLoginMethod, twoFactor } from "better-auth/plugins";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { buildDodoPlugin } from "./dodo-plugin";
import { orgPlugin } from "./org-plugin";
import { socialProviders } from "./social-providers";

export const auth = betterAuth({
  baseURL: getBaseUrl(),
  basePath: "/api/auth",
  trustedOrigins: [
    getBaseUrl(),
    "http://localhost:3000",
    "http://localhost:8788",
    "http://192.168.1.68:3000",
  ],

  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      organization: schema.organization,
      member: schema.member,
      invitation: schema.invitation,
      organizationRole: schema.organizationRole,
      ssoProvider: schema.ssoProvider,
      apikey: schema.apikey,
      twoFactor: schema.twoFactor,
      passkey: schema.passkey,
      subscription: schema.subscription,
    },
  }),

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 600,
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      void sendResetPasswordEmail({
        userName: user.name,
        resetUrl: url,
        recipientEmail: user.email,
      });
    },
  },

  socialProviders,

  plugins: [
    lastLoginMethod(),
    twoFactor(),
    passkey(),
    apiKey({
      references: "organization",
      defaultPrefix: "fdy_",
      requireName: true,
      keyExpiration: { defaultExpiresIn: null },
    }),
    sso({
      organizationProvisioning: {
        disabled: false,
        defaultRole: "member",
      },
    }),
    orgPlugin,
    ...buildDodoPlugin(),
  ],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
