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
  console.info("[Dodo] subscription.active received", {
    subscription_id: sub.subscription_id,
    product_id: sub.product_id,
    status: sub.status,
    referenceId,
    next_billing_date: sub.next_billing_date,
  });

  if (!referenceId) {
    console.warn("[Dodo] subscription.active missing referenceId — skipping");
    return;
  }

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

    if (!claimed) {
      console.info("[Dodo] subscription.active duplicate — already processed, skipping");
      return;
    }

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

    console.info(`[Dodo] subscription.active processed: org=${referenceId} plan=${plan} interval=${billingInterval}`);
  });
}

export async function onSubscriptionRenewed(payload: unknown) {
  const sub = extractSub(payload);
  console.info("[Dodo] subscription.renewed received", {
    subscription_id: sub.subscription_id,
    product_id: sub.product_id,
    next_billing_date: sub.next_billing_date,
    cancel_at_next_billing_date: sub.cancel_at_next_billing_date,
  });

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

    if (!claimed) {
      console.info("[Dodo] subscription.renewed duplicate — already processed, skipping");
      return;
    }

    await tx
      .update(schema.subscription)
      .set({
        status: "active",
        periodEnd: sub.next_billing_date ? new Date(sub.next_billing_date) : null,
        cancelAtPeriodEnd: sub.cancel_at_next_billing_date === true,
      })
      .where(eq(schema.subscription.dodoSubscriptionId, sub.subscription_id));

    console.info(`[Dodo] subscription.renewed processed: id=${sub.subscription_id}`);
  });
}

export async function onSubscriptionCancelled(payload: unknown) {
  const sub = extractSub(payload);
  console.info("[Dodo] subscription.cancelled received", {
    subscription_id: sub.subscription_id,
    product_id: sub.product_id,
  });

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

    if (!claimed) {
      console.info("[Dodo] subscription.cancelled duplicate — already processed, skipping");
      return;
    }

    // cancelAtPeriodEnd: false because the cancellation has already materialised at this point.
    await tx
      .update(schema.subscription)
      .set({ status: "cancelled", cancelAtPeriodEnd: false })
      .where(eq(schema.subscription.dodoSubscriptionId, sub.subscription_id));

    console.info(`[Dodo] subscription.cancelled processed: id=${sub.subscription_id}`);
  });
}

export async function onSubscriptionExpired(payload: unknown) {
  const sub = extractSub(payload);
  console.info("[Dodo] subscription.expired received", {
    subscription_id: sub.subscription_id,
    product_id: sub.product_id,
  });

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

    if (!claimed) {
      console.info("[Dodo] subscription.expired duplicate — already processed, skipping");
      return;
    }

    await tx
      .update(schema.subscription)
      .set({ status: "cancelled", endedAt: new Date() })
      .where(eq(schema.subscription.dodoSubscriptionId, sub.subscription_id));

    console.info(`[Dodo] subscription.expired processed: id=${sub.subscription_id}`);
  });
}

export async function onSubscriptionUpdated(payload: unknown) {
  const sub = extractSub(payload);
  console.info("[Dodo] subscription.updated received", {
    subscription_id: sub.subscription_id,
    product_id: sub.product_id,
    next_billing_date: sub.next_billing_date,
    cancel_at_next_billing_date: sub.cancel_at_next_billing_date,
  });

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

  console.info(`[Dodo] subscription.updated processed: id=${sub.subscription_id} plan=${plan} interval=${billingInterval}`);
}
