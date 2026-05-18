import { checkout, dodopayments, portal, webhooks } from "@dodopayments/better-auth";
import { getEnv } from "@utils/get-env";
import { dodoClient } from "./dodo-client";
import {
  onSubscriptionActive,
  onSubscriptionCancelled,
  onSubscriptionExpired,
  onSubscriptionRenewed,
  onSubscriptionUpdated,
} from "./dodo-webhook-handlers";

const env = getEnv();

function buildCheckoutProducts() {
  return [
    env.DODO_STARTER_MONTHLY_PRODUCT_ID && {
      productId: env.DODO_STARTER_MONTHLY_PRODUCT_ID,
      slug: "starter-monthly",
    },
    env.DODO_STARTER_ANNUAL_PRODUCT_ID && {
      productId: env.DODO_STARTER_ANNUAL_PRODUCT_ID,
      slug: "starter-annual",
    },
    env.DODO_PRO_MONTHLY_PRODUCT_ID && {
      productId: env.DODO_PRO_MONTHLY_PRODUCT_ID,
      slug: "professional-monthly",
    },
    env.DODO_PRO_ANNUAL_PRODUCT_ID && {
      productId: env.DODO_PRO_ANNUAL_PRODUCT_ID,
      slug: "professional-annual",
    },
  ].filter(Boolean) as { productId: string; slug: string }[];
}

export function buildDodoPlugin() {
  if (!dodoClient) return [];
  return [
    dodopayments({
      client: dodoClient,
      createCustomerOnSignUp: false,
      use: [
        checkout({
          products: buildCheckoutProducts(),
          successUrl: "/billing?upgraded=true",
          authenticatedUsersOnly: true,
        }),
        portal(),
        ...(env.DODO_PAYMENTS_WEBHOOK_SECRET
          ? [
              webhooks({
                webhookKey: env.DODO_PAYMENTS_WEBHOOK_SECRET,
                onSubscriptionActive,
                onSubscriptionRenewed,
                onSubscriptionCancelled,
                onSubscriptionExpired,
                onSubscriptionUpdated,
              }),
            ]
          : []),
      ],
    }),
  ];
}
