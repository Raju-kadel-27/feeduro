import { apiKey } from "@better-auth/api-key";
import { oauthProvider } from "@better-auth/oauth-provider";
import { passkey } from "@better-auth/passkey";
import { sso } from "@better-auth/sso";
import { APP_DOMAIN } from "@features/domains/constants";
import { sendResetPasswordEmail } from "@features/internal/jobs/send-reset-password-email";
import { getBaseUrl } from "@utils/base-url";
import { getEnv } from "@utils/get-env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, jwt, lastLoginMethod, twoFactor } from "better-auth/plugins";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { buildDodoPlugin } from "./dodo-plugin";
import { buildOrgPlugin } from "./org-plugin";
import { socialProviders } from "./social-providers";

export type Auth = ReturnType<typeof betterAuth>;
export type Session = Auth["$Infer"]["Session"];

const authCache = new WeakMap<Db, Auth>();

// Org public boards live on `{orgSlug}.feeduro.com`, so the session cookie must
// span subdomains and those origins must pass better-auth's CSRF origin check.
// Only applies when BASE_URL is actually on the app domain — a `.feeduro.com`
// cookie domain would break auth on localhost and *.workers.dev.
function isOnAppDomain(): boolean {
  const hostname = new URL(getBaseUrl()).hostname;
  return hostname === APP_DOMAIN || hostname.endsWith(`.${APP_DOMAIN}`);
}

export function getAuth(db: Db): Auth {
  const cached = authCache.get(db);
  if (cached) return cached;

  // `instance` must be declared before betterAuth() so the oauthProvider's
  // clientPrivileges closure can reference it. By the time that callback is
  // ever called the assignment below will have completed.
  let instance!: Auth;

  instance = betterAuth({
    baseURL: getBaseUrl(),
    basePath: "/api/auth",
    trustedOrigins: [
      getBaseUrl(),
      `https://*.${APP_DOMAIN}`,
      "http://localhost:3000",
      "http://localhost:8788",
      "http://192.168.1.68:3000",
    ],

    advanced: isOnAppDomain()
      ? { crossSubDomainCookies: { enabled: true, domain: APP_DOMAIN } }
      : undefined,

    disabledPaths: ["/token"],

    database: drizzleAdapter(db, {
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
        allowDynamicClientRegistration: true,
        allowPublicClientPrelogin: true,
        clientReference: ({ session }) => {
          return (session?.activeOrganizationId as string | undefined) ?? undefined;
        },
        clientPrivileges: async ({ headers, session }): Promise<boolean> => {
          if (!session?.activeOrganizationId) return false;
          const memberData = await instance.api.getActiveMember({ headers });
          const role = memberData?.role;
          return role === "admin" || role === "owner";
        },
        customAccessTokenClaims: ({ referenceId }) => {
          if (!referenceId) return {};
          return { [`${getEnv().BASE_URL}/org`]: referenceId };
        },
      }),
      buildOrgPlugin(db),
      ...buildDodoPlugin(db),
    ],
  });

  authCache.set(db, instance);
  return instance;
}
