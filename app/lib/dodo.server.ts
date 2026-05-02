import { getEnv } from "@utils/get-env";
import DodoPayments from "dodopayments";

export function getDodoClient(): DodoPayments {
  const env = getEnv();
  return new DodoPayments({
    bearerToken: env.DODO_PAYMENTS_API_KEY!,
    environment: env.ENVIRONMENT === "production" ? "live_mode" : "test_mode",
  });
}

export async function createDodoCheckoutSession({
  productId,
  organizationId,
  returnUrl,
}: {
  productId: string;
  organizationId: string;
  returnUrl: string;
}): Promise<{ url: string } | { error: string }> {
  try {
    const dodo = getDodoClient();
    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      metadata: { referenceId: organizationId },
      return_url: returnUrl,
    });
    if (!session.checkout_url) return { error: "Dodo did not return a checkout URL" };
    return { url: session.checkout_url };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Dodo Payments API error";
    return { error: message };
  }
}

export async function changeDodoPlan({
  dodoSubscriptionId,
  productId,
}: {
  dodoSubscriptionId: string;
  productId: string;
}): Promise<{ error?: string }> {
  try {
    const dodo = getDodoClient();
    await dodo.subscriptions.changePlan(dodoSubscriptionId, {
      product_id: productId,
      proration_billing_mode: "prorated_immediately",
      quantity: 1,
    });
    return {};
  } catch (e) {
    const message = e instanceof Error ? e.message : "Dodo Payments API error";
    return { error: message };
  }
}

export async function cancelDodoSubscription(
  dodoSubscriptionId: string,
): Promise<{ error?: string }> {
  try {
    const dodo = getDodoClient();
    await dodo.subscriptions.update(dodoSubscriptionId, {
      cancel_at_next_billing_date: true,
    });
    return {};
  } catch (e) {
    const message = e instanceof Error ? e.message : "Dodo Payments API error";
    return { error: message };
  }
}
