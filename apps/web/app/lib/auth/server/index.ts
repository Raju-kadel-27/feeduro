import { apiKey } from "@better-auth/api-key";
import { oauthProvider } from "@better-auth/oauth-provider";
import { passkey } from "@better-auth/passkey";
import { sso } from "@better-auth/sso";
import { sendResetPasswordEmail } from "@features/internal/jobs/send-reset-password-email";
import { getBaseUrl } from "@utils/base-url";
import { getEnv } from "@utils/get-env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, jwt, lastLoginMethod, twoFactor } from "better-auth/plugins";
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

  // Disable the /token endpoint to prevent conflict with OAuth provider's /oauth2/token
  disabledPaths: ["/token"],

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
      jwks: schema.jwks,
      oauthClient: schema.oauthClient,
      oauthRefreshToken: schema.oauthRefreshToken,
      oauthAccessToken: schema.oauthAccessToken,
      oauthConsent: schema.oauthConsent,
    },
  }),

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 600,
    },
  },

  databaseHooks: {
    user: {
      update: {
        before: async (user) => {
          if (typeof user.image === "string" && user.image.startsWith("data:")) {
            return { data: { ...user, image: null } };
          }
        },
      },
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

  account: {
    accountLinking: {
      allowDifferentEmails: true,
    },
  },

  plugins: [
    admin({
      adminUserIds: (getEnv().PLATFORM_ADMIN_USER_IDS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    }),
    lastLoginMethod(),
    twoFactor(),
    passkey(),
    apiKey({
      references: "organization",
      defaultPrefix: "fdy_",
      requireName: true,
      keyExpiration: { defaultExpiresIn: null },
      // Disable rate limiting by default — callers control it per-key if needed
      rateLimit: { enabled: false },
    }),
    sso({
      organizationProvisioning: {
        disabled: false,
        defaultRole: "member",
      },
    }),
    // jwt() must come before oauthProvider() — oauth provider depends on it for token signing
    jwt(),
    oauthProvider({
      loginPage: "/sign-in",
      consentPage: "/consent",
      silenceWarnings: { oauthAuthServerConfig: true },
      scopes: ["openid", "profile", "email", "offline_access"],
      // Allow dynamic client registration (users can create OAuth apps via API)
      allowDynamicClientRegistration: true,
      allowPublicClientPrelogin: true,
      // Tie OAuth clients to the active organization
      clientReference: ({ session }) => {
        return (session?.activeOrganizationId as string | undefined) ?? undefined;
      },
      // Only org admins and owners can manage OAuth clients
      clientPrivileges: async ({ headers, session }): Promise<boolean> => {
        if (!session?.activeOrganizationId) return false;
        const memberData = await auth.api.getActiveMember({ headers });
        const role = memberData?.role;
        return role === "admin" || role === "owner";
      },
      // Custom claims added to access tokens (e.g. org ID for API authorization)
      customAccessTokenClaims: ({ referenceId }) => {
        if (!referenceId) return {};
        return { [`${getEnv().BASE_URL}/org`]: referenceId };
      },
    }),
    orgPlugin,
    ...buildDodoPlugin(),
  ],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
