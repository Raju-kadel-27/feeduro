import { getEnv } from "@utils/get-env";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { resolveDodoPlan, resolveDodoInterval } from "./dodo-resolvers";
import type { DodoSub } from "./dodo-client";

const env = getEnv();

function extractSub(payload: unknown): DodoSub {
  return (payload as { data: DodoSub }).data;
}

export async function onSubscriptionActive(payload: unknown) {
  const sub = extractSub(payload);
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
      periodEnd: sub.next_billing_date ? new Date(sub.next_billing_date) : null,
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
        periodEnd: sub.next_billing_date ? new Date(sub.next_billing_date) : null,
      },
    });
  console.info(`[Dodo] Subscription active: org=${referenceId} plan=${plan}`);
}

export async function onSubscriptionRenewed(payload: unknown) {
  const sub = extractSub(payload);
  if (!sub.subscription_id) return;
  const db = getDb();
  await db
    .update(schema.subscription)
    .set({
      status: "active",
      periodEnd: sub.next_billing_date ? new Date(sub.next_billing_date) : null,
      cancelAtPeriodEnd: sub.cancel_at_next_billing_date === true,
    })
    .where(eq(schema.subscription.dodoSubscriptionId, sub.subscription_id));
  console.info(`[Dodo] Subscription renewed: id=${sub.subscription_id}`);
}

export async function onSubscriptionCancelled(payload: unknown) {
  const sub = extractSub(payload);
  if (!sub.subscription_id) return;
  const db = getDb();
  await db
    .update(schema.subscription)
    .set({ status: "cancelled", cancelAtPeriodEnd: true })
    .where(eq(schema.subscription.dodoSubscriptionId, sub.subscription_id));
  console.info(`[Dodo] Subscription cancelled: id=${sub.subscription_id}`);
}

export async function onSubscriptionExpired(payload: unknown) {
  const sub = extractSub(payload);
  if (!sub.subscription_id) return;
  const db = getDb();
  await db
    .update(schema.subscription)
    .set({ status: "cancelled", endedAt: new Date() })
    .where(eq(schema.subscription.dodoSubscriptionId, sub.subscription_id));
  console.info(`[Dodo] Subscription expired: id=${sub.subscription_id}`);
}

export async function onSubscriptionUpdated(payload: unknown) {
  const sub = extractSub(payload);
  if (!sub.subscription_id) return;
  const db = getDb();
  const plan = resolveDodoPlan(env, sub.product_id);
  const billingInterval = resolveDodoInterval(env, sub.product_id);
  await db
    .update(schema.subscription)
    .set({
      plan,
      billingInterval,
      periodEnd: sub.next_billing_date ? new Date(sub.next_billing_date) : null,
      cancelAtPeriodEnd: sub.cancel_at_next_billing_date === true,
    })
    .where(eq(schema.subscription.dodoSubscriptionId, sub.subscription_id));
  console.info(`[Dodo] Subscription updated: id=${sub.subscription_id} plan=${plan}`);
}
