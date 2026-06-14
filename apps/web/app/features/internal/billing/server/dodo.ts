import { getDodoClient } from "@services/dodo/client";

export async function createDodoCheckoutSession({
  productId,
  organizationId,
  returnUrl,
  affiliateCode,
}: {
  productId: string;
  organizationId: string;
  returnUrl: string;
  // Optional: set when the org owner arrived via a referral link so the
  // subscription.active webhook can attribute the commission correctly.
  affiliateCode?: string;
}): Promise<{ url: string } | { error: string }> {
  try {
    const dodo = getDodoClient();
    const metadata: Record<string, string> = { referenceId: organizationId };
    if (affiliateCode) metadata.affiliateCode = affiliateCode;
    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      metadata,
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
