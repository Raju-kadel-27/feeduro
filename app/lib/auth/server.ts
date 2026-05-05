import { apiKey } from "@better-auth/api-key";
import { sso } from "@better-auth/sso";
import { checkout, dodopayments, portal, webhooks } from "@dodopayments/better-auth";
import { sendInvitationEmail } from "@jobs/send-invitation-email";
import { getBaseUrl } from "@utils/base-url";
import { getEnv } from "@utils/get-env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth, organization } from "better-auth/plugins";
import DodoPayments from "dodopayments";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { feedbackBoards } from "@/db/schema";

const env = getEnv();

const dodoClient = env.DODO_PAYMENTS_API_KEY
  ? new DodoPayments({
      bearerToken: env.DODO_PAYMENTS_API_KEY,
      environment: env.ENVIRONMENT === "production" ? "live_mode" : "test_mode",
    })
  : null;

type DodoSub = {
  subscription_id: string;
  product_id: string;
  status: string;
  cancel_at_next_billing_date?: boolean;
  next_billing_date?: string;
  metadata: Record<string, string>;
  customer?: { customer_id: string };
};

function resolveDodoPlan(e: ReturnType<typeof getEnv>, productId: string): string {
  if (
    productId === e.DODO_STARTER_MONTHLY_PRODUCT_ID ||
    productId === e.DODO_STARTER_ANNUAL_PRODUCT_ID
  )
    return "starter";
  if (productId === e.DODO_PRO_MONTHLY_PRODUCT_ID || productId === e.DODO_PRO_ANNUAL_PRODUCT_ID)
    return "professional";
  return "starter";
}

function resolveDodoInterval(e: ReturnType<typeof getEnv>, productId: string): string {
  if (productId === e.DODO_STARTER_ANNUAL_PRODUCT_ID || productId === e.DODO_PRO_ANNUAL_PRODUCT_ID)
    return "annual";
  return "monthly";
}

export const auth = betterAuth({
  baseURL: getBaseUrl(),
  basePath: "/api/auth",
  trustedOrigins: [getBaseUrl()],

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
      ssoProvider: schema.ssoProvider,
      apikey: schema.apikey,
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
  },

  socialProviders: {
    google: {
      clientId: getEnv().GOOGLE_CLIENT_ID,
      clientSecret: getEnv().GOOGLE_CLIENT_SECRET,
      prompt: "select_account",
    },
    ...(getEnv().DISCORD_CLIENT_ID && getEnv().DISCORD_CLIENT_SECRET
      ? {
          discord: {
            clientId: getEnv().DISCORD_CLIENT_ID as string,
            clientSecret: getEnv().DISCORD_CLIENT_SECRET as string,
          },
        }
      : {}),
    ...(getEnv().SLACK_CLIENT_ID && getEnv().SLACK_CLIENT_SECRET
      ? {
          slack: {
            clientId: getEnv().SLACK_CLIENT_ID as string,
            clientSecret: getEnv().SLACK_CLIENT_SECRET as string,
          },
        }
      : {}),
  },

  plugins: [
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
    organization({
      // Org creator becomes "admin" so they pass RBAC checks (role === "admin")
      creatorRole: "admin",
      allowUserToCreateOrganization: async (_user) => true,
      sendInvitationEmail: async (data) => {
        const acceptUrl = `${getBaseUrl()}/accept-invitation?invitationId=${data.id}`;
        const { inviter, organization, role } = data;
        const emailStatus = await sendInvitationEmail({
          inviterName: inviter.user.name,
          inviterEmail: inviter.user.email,
          workspaceName: organization.name,
          role: role ?? "member",
          acceptUrl,
          recipientEmail: data.email,
        });
        console.log({ emailStatus });
      },
      organizationHooks: {
        afterCreateOrganization: async ({ organization, member }) => {
          console.info(
            `[Org] Created: ${organization.name} (${organization.id}), owner member: ${member.id}`,
          );
          const db = getDb();
          await db.insert(feedbackBoards).values([
            {
              organizationId: organization.id,
              name: "Feature Requests",
              slug: "feature-requests",
              visibility: "public",
              isDefault: true,
              createdBy: member.userId,
            },
            {
              organizationId: organization.id,
              name: "Bug Reports",
              slug: "bug-reports",
              visibility: "public",
              isDefault: false,
              createdBy: member.userId,
            },
          ]);
        },
      },
    }),
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? [
          genericOAuth({
            config: [
              {
                providerId: "github",
                clientId: env.GITHUB_CLIENT_ID,
                clientSecret: env.GITHUB_CLIENT_SECRET,
                authorizationUrl: "https://github.com/login/oauth/authorize",
                tokenUrl: "https://github.com/login/oauth/access_token",
                scopes: ["repo", "read:user", "user:email"],
                // GitHub returns URL-encoded tokens by default — request JSON
                getToken: async ({ code, redirectURI }) => {
                  const res = await fetch("https://github.com/login/oauth/access_token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    body: JSON.stringify({
                      client_id: env.GITHUB_CLIENT_ID,
                      client_secret: env.GITHUB_CLIENT_SECRET,
                      code,
                      redirect_uri: redirectURI,
                    }),
                  });
                  const data = (await res.json()) as {
                    access_token?: string;
                    scope?: string;
                    error?: string;
                  };
                  if (data.error || !data.access_token)
                    throw new Error(data.error ?? "GitHub token exchange failed");
                  return {
                    accessToken: data.access_token,
                    refreshToken: undefined,
                    accessTokenExpiresAt: undefined,
                    scopes: data.scope?.split(",") ?? [],
                    idToken: undefined,
                    raw: data,
                  };
                },
                getUserInfo: async (tokens) => {
                  const res = await fetch("https://api.github.com/user", {
                    headers: {
                      Authorization: `Bearer ${tokens.accessToken}`,
                      Accept: "application/vnd.github.v3+json",
                    },
                  });
                  const profile = (await res.json()) as {
                    id: number;
                    login: string;
                    name?: string;
                    email?: string;
                    avatar_url?: string;
                  };
                  // Fetch primary verified email if not exposed in profile
                  let email = profile.email ?? null;
                  if (!email) {
                    const emailRes = await fetch("https://api.github.com/user/emails", {
                      headers: {
                        Authorization: `Bearer ${tokens.accessToken}`,
                        Accept: "application/vnd.github.v3+json",
                      },
                    });
                    const emails = (await emailRes.json()) as Array<{
                      email: string;
                      primary: boolean;
                      verified: boolean;
                    }>;
                    email = emails.find((e) => e.primary && e.verified)?.email ?? null;
                  }
                  return {
                    id: String(profile.id),
                    name: profile.name ?? profile.login,
                    email: email ?? `${profile.login}@github.noemail`,
                    image: profile.avatar_url,
                    emailVerified: !!email,
                  };
                },
                // Only used for account linking, not sign-in
                disableImplicitSignUp: true,
              },
            ],
          }),
        ]
      : []),
    ...(dodoClient
      ? [
          dodopayments({
            client: dodoClient,
            createCustomerOnSignUp: false,
            use: [
              checkout({
                products: [
                  ...(env.DODO_STARTER_MONTHLY_PRODUCT_ID
                    ? [{ productId: env.DODO_STARTER_MONTHLY_PRODUCT_ID, slug: "starter-monthly" }]
                    : []),
                  ...(env.DODO_STARTER_ANNUAL_PRODUCT_ID
                    ? [{ productId: env.DODO_STARTER_ANNUAL_PRODUCT_ID, slug: "starter-annual" }]
                    : []),
                  ...(env.DODO_PRO_MONTHLY_PRODUCT_ID
                    ? [{ productId: env.DODO_PRO_MONTHLY_PRODUCT_ID, slug: "professional-monthly" }]
                    : []),
                  ...(env.DODO_PRO_ANNUAL_PRODUCT_ID
                    ? [{ productId: env.DODO_PRO_ANNUAL_PRODUCT_ID, slug: "professional-annual" }]
                    : []),
                ],
                successUrl: "/billing?upgraded=true",
                authenticatedUsersOnly: true,
              }),
              portal(),
              ...(env.DODO_PAYMENTS_WEBHOOK_SECRET
                ? [
                    webhooks({
                      webhookKey: env.DODO_PAYMENTS_WEBHOOK_SECRET,
                      onSubscriptionActive: async (payload) => {
                        const sub = (payload as { data: DodoSub }).data;
                        const referenceId = sub.metadata?.referenceId;
                        if (!referenceId) return;
                        const db = getDb();
                        const plan = resolveDodoPlan(env, sub.product_id);
                        const billingInterval = resolveDodoInterval(env, sub.product_id);
                        await db
                          .insert(schema.subscription)
                          .values({
                            id: sub.subscription_id,
                            plan,
                            referenceId,
                            dodoCustomerId: sub.customer?.customer_id ?? null,
                            dodoSubscriptionId: sub.subscription_id,
                            status: "active",
                            billingInterval,
                            periodEnd: sub.next_billing_date
                              ? new Date(sub.next_billing_date)
                              : null,
                          })
                          .onConflictDoUpdate({
                            target: schema.subscription.id,
                            set: {
                              status: "active",
                              plan,
                              billingInterval,
                              cancelAtPeriodEnd: false,
                              dodoSubscriptionId: sub.subscription_id,
                              dodoCustomerId: sub.customer?.customer_id ?? null,
                              periodEnd: sub.next_billing_date
                                ? new Date(sub.next_billing_date)
                                : null,
                            },
                          });
                        console.info(`[Dodo] Subscription active: org=${referenceId} plan=${plan}`);
                      },
                      onSubscriptionRenewed: async (payload) => {
                        const sub = (payload as { data: DodoSub }).data;
                        if (!sub.subscription_id) return;
                        const db = getDb();
                        await db
                          .update(schema.subscription)
                          .set({
                            status: "active",
                            periodEnd: sub.next_billing_date
                              ? new Date(sub.next_billing_date)
                              : null,
                            cancelAtPeriodEnd: sub.cancel_at_next_billing_date === true,
                          })
                          .where(eq(schema.subscription.dodoSubscriptionId, sub.subscription_id));
                        console.info(`[Dodo] Subscription renewed: id=${sub.subscription_id}`);
                      },
                      onSubscriptionCancelled: async (payload) => {
                        const sub = (payload as { data: DodoSub }).data;
                        if (!sub.subscription_id) return;
                        const db = getDb();
                        await db
                          .update(schema.subscription)
                          .set({ status: "cancelled", cancelAtPeriodEnd: true })
                          .where(eq(schema.subscription.dodoSubscriptionId, sub.subscription_id));
                        console.info(`[Dodo] Subscription cancelled: id=${sub.subscription_id}`);
                      },
                      onSubscriptionExpired: async (payload) => {
                        const sub = (payload as { data: DodoSub }).data;
                        if (!sub.subscription_id) return;
                        const db = getDb();
                        await db
                          .update(schema.subscription)
                          .set({ status: "cancelled", endedAt: new Date() })
                          .where(eq(schema.subscription.dodoSubscriptionId, sub.subscription_id));
                        console.info(`[Dodo] Subscription expired: id=${sub.subscription_id}`);
                      },
                      onSubscriptionUpdated: async (payload) => {
                        const sub = (payload as { data: DodoSub }).data;
                        if (!sub.subscription_id) return;
                        const db = getDb();
                        const plan = resolveDodoPlan(env, sub.product_id);
                        const billingInterval = resolveDodoInterval(env, sub.product_id);
                        await db
                          .update(schema.subscription)
                          .set({
                            plan,
                            billingInterval,
                            periodEnd: sub.next_billing_date
                              ? new Date(sub.next_billing_date)
                              : null,
                            cancelAtPeriodEnd: sub.cancel_at_next_billing_date === true,
                          })
                          .where(eq(schema.subscription.dodoSubscriptionId, sub.subscription_id));
                        console.info(
                          `[Dodo] Subscription updated: id=${sub.subscription_id} plan=${plan}`,
                        );
                      },
                    }),
                  ]
                : []),
            ],
          }),
        ]
      : []),
  ],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
