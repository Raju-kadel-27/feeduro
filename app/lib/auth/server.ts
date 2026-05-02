import { apiKey } from "@better-auth/api-key";
import { sso } from "@better-auth/sso";
import { stripe } from "@better-auth/stripe";
import { checkout, dodopayments, portal, webhooks } from "@dodopayments/better-auth";
import { sendInvitationEmail } from "@jobs/send-invitation-email";
import { getBaseUrl } from "@utils/base-url";
import { getEnv } from "@utils/get-env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import DodoPayments from "dodopayments";
import { and, eq } from "drizzle-orm";
import Stripe from "stripe";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { feedbackBoards } from "@/db/schema";

const env = getEnv();

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
});

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
    stripe({
      stripeClient,
      stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
      createCustomerOnSignUp: false,
      subscription: {
        enabled: true,
        plans: [
          ...(env.STRIPE_STARTER_MONTHLY_PRICE_ID
            ? [
                {
                  name: "starter",
                  priceId: env.STRIPE_STARTER_MONTHLY_PRICE_ID,
                  ...(env.STRIPE_STARTER_ANNUAL_PRICE_ID
                    ? { annualDiscountPriceId: env.STRIPE_STARTER_ANNUAL_PRICE_ID }
                    : {}),
                  limits: {
                    boards: 5,
                    privateBoards: 1,
                    guestPosting: 1,
                  },
                  freeTrial: { days: 14 },
                },
              ]
            : []),
          ...(env.STRIPE_PRO_MONTHLY_PRICE_ID
            ? [
                {
                  name: "professional",
                  priceId: env.STRIPE_PRO_MONTHLY_PRICE_ID,
                  ...(env.STRIPE_PRO_ANNUAL_PRICE_ID
                    ? { annualDiscountPriceId: env.STRIPE_PRO_ANNUAL_PRICE_ID }
                    : {}),
                  limits: {
                    boards: -1,
                    customDomain: 1,
                    whiteLabelBranding: 1,
                    sso: 1,
                    unlimitedAdmins: 1,
                    unlimitedIntegrations: 1,
                  },
                },
              ]
            : []),
        ],
        authorizeReference: async ({ user, referenceId }) => {
          const db = getDb();
          const memberRecord = await db.query.member.findFirst({
            where: and(
              eq(schema.member.userId, user.id),
              eq(schema.member.organizationId, referenceId),
            ),
          });
          return memberRecord?.role === "admin";
        },
        onSubscriptionComplete: async ({ subscription, plan }) => {
          console.info(
            `[Stripe] Subscription complete: org=${subscription.referenceId} plan=${plan.name}`,
          );
        },
        onSubscriptionCancel: async ({ subscription }) => {
          console.info(`[Stripe] Subscription canceled: org=${subscription.referenceId}`);
        },
      },
      organization: {
        enabled: true,
      },
    }),
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
