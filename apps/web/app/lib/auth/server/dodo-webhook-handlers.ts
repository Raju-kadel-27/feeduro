import { getEnv } from "@utils/get-env";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import type { DodoSub } from "./dodo-client";
import { resolveDodoInterval, resolveDodoPlan } from "./dodo-resolvers";

const env = getEnv();

function extractSub(payload: unknown): DodoSub {
  return (payload as { data: DodoSub }).data;
}

function billingDateStr(sub: DodoSub): string {
  return sub.next_billing_date
    ? new Date(sub.next_billing_date).toISOString().slice(0, 10)
    : "1970-01-01";
}

export async function onSubscriptionActive(payload: unknown) {
  const sub = extractSub(payload);
  const referenceId = sub.metadata?.referenceId;

  if (!referenceId) return;

  const db = getDb();
  const plan = resolveDodoPlan(env, sub.product_id);
  const billingInterval = resolveDodoInterval(env, sub.product_id);

  await db.transaction(async (tx) => {
    const [claimed] = await tx
      .insert(schema.dodoWebhookEvents)
      .values({
        eventType: "active",
        subscriptionId: sub.subscription_id,
        productId: sub.product_id,
        billingDate: billingDateStr(sub),
      })
      .onConflictDoNothing()
      .returning();

    if (!claimed) return;

    await tx
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
  });
}

export async function onSubscriptionRenewed(payload: unknown) {
  const sub = extractSub(payload);
  if (!sub.subscription_id) return;
  const db = getDb();

  await db.transaction(async (tx) => {
    const [claimed] = await tx
      .insert(schema.dodoWebhookEvents)
      .values({
        eventType: "renewed",
        subscriptionId: sub.subscription_id,
        productId: sub.product_id,
        billingDate: billingDateStr(sub),
      })
      .onConflictDoNothing()
      .returning();

    if (!claimed) return;

    await tx
      .update(schema.subscription)
      .set({
        status: "active",
        periodEnd: sub.next_billing_date ? new Date(sub.next_billing_date) : null,
        cancelAtPeriodEnd: sub.cancel_at_next_billing_date === true,
      })
      .where(eq(schema.subscription.dodoSubscriptionId, sub.subscription_id));
  });
}

export async function onSubscriptionCancelled(payload: unknown) {
  const sub = extractSub(payload);
  if (!sub.subscription_id) return;
  const db = getDb();

  await db.transaction(async (tx) => {
    const [claimed] = await tx
      .insert(schema.dodoWebhookEvents)
      .values({
        eventType: "cancelled",
        subscriptionId: sub.subscription_id,
        productId: sub.product_id,
        billingDate: billingDateStr(sub),
      })
      .onConflictDoNothing()
      .returning();

    if (!claimed) return;

    // cancelAtPeriodEnd: false because the cancellation has already materialised at this point.
    await tx
      .update(schema.subscription)
      .set({ status: "cancelled", cancelAtPeriodEnd: false })
      .where(eq(schema.subscription.dodoSubscriptionId, sub.subscription_id));
  });
}

export async function onSubscriptionExpired(payload: unknown) {
  const sub = extractSub(payload);
  if (!sub.subscription_id) return;
  const db = getDb();

  await db.transaction(async (tx) => {
    const [claimed] = await tx
      .insert(schema.dodoWebhookEvents)
      .values({
        eventType: "expired",
        subscriptionId: sub.subscription_id,
        productId: sub.product_id,
        billingDate: billingDateStr(sub),
      })
      .onConflictDoNothing()
      .returning();

    if (!claimed) return;

    await tx
      .update(schema.subscription)
      .set({ status: "cancelled", endedAt: new Date() })
      .where(eq(schema.subscription.dodoSubscriptionId, sub.subscription_id));
  });
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
}
