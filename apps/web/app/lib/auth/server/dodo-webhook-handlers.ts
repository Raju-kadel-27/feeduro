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

// Composite key that uniquely identifies a logical webhook event from available payload fields.
// Includes enough context to distinguish separate deliveries of distinct events without a
// webhook delivery ID (which lives in the request header, not the payload body).
function buildEventKey(type: string, sub: DodoSub): string {
  const date = sub.next_billing_date
    ? new Date(sub.next_billing_date).toISOString().slice(0, 10)
    : "none";
  switch (type) {
    case "active":    return `active:${sub.subscription_id}:${date}`;
    case "renewed":   return `renewed:${sub.subscription_id}:${date}`;
    case "cancelled": return `cancelled:${sub.subscription_id}`;
    case "expired":   return `expired:${sub.subscription_id}`;
    case "updated":   return `updated:${sub.subscription_id}:${sub.product_id}:${date}`;
    default:          return `${type}:${sub.subscription_id}:${date}`;
  }
}

export async function onSubscriptionActive(payload: unknown) {
  const sub = extractSub(payload);
  const referenceId = sub.metadata?.referenceId;
  if (!referenceId) return;
  const db = getDb();
  const plan = resolveDodoPlan(env, sub.product_id); // throws on unknown product ID
  const billingInterval = resolveDodoInterval(env, sub.product_id);

  await db.transaction(async (tx) => {
    const [claimed] = await tx
      .insert(schema.dodoWebhookEvents)
      .values({ eventKey: buildEventKey("active", sub) })
      .onConflictDoNothing()
      .returning({ k: schema.dodoWebhookEvents.eventKey });
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

  console.info(`[Dodo] Subscription active: org=${referenceId} plan=${plan}`);
}

export async function onSubscriptionRenewed(payload: unknown) {
  const sub = extractSub(payload);
  if (!sub.subscription_id) return;
  const db = getDb();

  await db.transaction(async (tx) => {
    const [claimed] = await tx
      .insert(schema.dodoWebhookEvents)
      .values({ eventKey: buildEventKey("renewed", sub) })
      .onConflictDoNothing()
      .returning({ k: schema.dodoWebhookEvents.eventKey });
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

  console.info(`[Dodo] Subscription renewed: id=${sub.subscription_id}`);
}

export async function onSubscriptionCancelled(payload: unknown) {
  const sub = extractSub(payload);
  if (!sub.subscription_id) return;
  const db = getDb();

  await db.transaction(async (tx) => {
    const [claimed] = await tx
      .insert(schema.dodoWebhookEvents)
      .values({ eventKey: buildEventKey("cancelled", sub) })
      .onConflictDoNothing()
      .returning({ k: schema.dodoWebhookEvents.eventKey });
    if (!claimed) return;

    // cancelAtPeriodEnd: false because the cancellation has already materialised at this point.
    await tx
      .update(schema.subscription)
      .set({ status: "cancelled", cancelAtPeriodEnd: false })
      .where(eq(schema.subscription.dodoSubscriptionId, sub.subscription_id));
  });

  console.info(`[Dodo] Subscription cancelled: id=${sub.subscription_id}`);
}

export async function onSubscriptionExpired(payload: unknown) {
  const sub = extractSub(payload);
  if (!sub.subscription_id) return;
  const db = getDb();

  await db.transaction(async (tx) => {
    const [claimed] = await tx
      .insert(schema.dodoWebhookEvents)
      .values({ eventKey: buildEventKey("expired", sub) })
      .onConflictDoNothing()
      .returning({ k: schema.dodoWebhookEvents.eventKey });
    if (!claimed) return;

    await tx
      .update(schema.subscription)
      .set({ status: "cancelled", endedAt: new Date() })
      .where(eq(schema.subscription.dodoSubscriptionId, sub.subscription_id));
  });

  console.info(`[Dodo] Subscription expired: id=${sub.subscription_id}`);
}

export async function onSubscriptionUpdated(payload: unknown) {
  const sub = extractSub(payload);
  if (!sub.subscription_id) return;
  const db = getDb();
  const plan = resolveDodoPlan(env, sub.product_id); // throws on unknown product ID
  const billingInterval = resolveDodoInterval(env, sub.product_id);

  await db.transaction(async (tx) => {
    const [claimed] = await tx
      .insert(schema.dodoWebhookEvents)
      .values({ eventKey: buildEventKey("updated", sub) })
      .onConflictDoNothing()
      .returning({ k: schema.dodoWebhookEvents.eventKey });
    if (!claimed) return;

    await tx
      .update(schema.subscription)
      .set({
        plan,
        billingInterval,
        periodEnd: sub.next_billing_date ? new Date(sub.next_billing_date) : null,
        cancelAtPeriodEnd: sub.cancel_at_next_billing_date === true,
      })
      .where(eq(schema.subscription.dodoSubscriptionId, sub.subscription_id));
  });

  console.info(`[Dodo] Subscription updated: id=${sub.subscription_id} plan=${plan}`);
}
