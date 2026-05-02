import { getEnv } from "@utils/get-env";
import Stripe from "stripe";

export function getStripeClient(): Stripe {
  return new Stripe(getEnv().STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
  });
}

export async function createCheckoutSession({
  priceId,
  organizationId,
  customerEmail,
  successUrl,
  cancelUrl,
  trialDays,
}: {
  priceId: string;
  organizationId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
}): Promise<string> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: customerEmail,
    metadata: { referenceId: organizationId },
    subscription_data: {
      metadata: { referenceId: organizationId },
      ...(trialDays ? { trial_period_days: trialDays } : {}),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  return session.url!;
}

export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<string> {
  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

export async function updateSubscriptionPlan({
  stripeSubscriptionId,
  priceId,
}: {
  stripeSubscriptionId: string;
  priceId: string;
}): Promise<boolean> {
  const stripe = getStripeClient();
  try {
    const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const itemId = sub.items.data[0]?.id;
    if (!itemId) return false;
    await stripe.subscriptions.update(stripeSubscriptionId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: "create_prorations",
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelSubscription(stripeSubscriptionId: string): Promise<boolean> {
  const stripe = getStripeClient();
  try {
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    return true;
  } catch {
    return false;
  }
}
