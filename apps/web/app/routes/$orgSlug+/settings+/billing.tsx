import { PageHeader } from "@components/common/page-header";
import { BillingToggle } from "@components/pricing/billing-toggle";
import { PlanCard } from "@components/pricing/plan-card";
import { type BillingInterval, PLANS, type PlanId, TRUST_BADGES } from "@components/pricing/plans";
import { Alert, AlertDescription } from "@components/ui/alert";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { requireOrgBySlug } from "@features/auth/server/guards";
import {
  cancelDodoSubscription,
  changeDodoPlan,
  createDodoCheckoutSession,
  resumeDodoSubscription,
} from "@features/internal/billing/server/dodo";
import { useBillingPoll } from "@features/internal/billing/use-billing-poll";
import { authClient } from "@lib/auth/client";
import { getEnv } from "@utils/get-env";
import { and, desc, eq, or } from "drizzle-orm";
import { CheckIcon, CreditCard, ExternalLinkIcon, SparklesIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { redirect, useFetcher } from "react-router";
import { z } from "zod";
import { subscription } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/billing";

export function meta() {
  return [{ title: "Billing | Feeduro" }];
}

const PLAN_RANK: Record<PlanId, number> = { free: 0, starter: 1, professional: 2 };

// ─── Loader ───────────────────────────────────────────────────────────────────

export function shouldRevalidate() {
  return false;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

  const activeSub = await db.query.subscription.findFirst({
    where: and(
      eq(subscription.referenceId, organizationId),
      or(
        eq(subscription.status, "active"),
        eq(subscription.status, "trialing"),
        eq(subscription.status, "past_due"),
      ),
    ),
    columns: {
      plan: true,
      status: true,
      billingInterval: true,
      periodEnd: true,
      cancelAtPeriodEnd: true,
      cancelAt: true,
      trialEnd: true,
      dodoSubscriptionId: true,
    },
    orderBy: desc(subscription.periodEnd),
  });

  return {
    subscription: activeSub ?? null,
    currentBillingInterval: (activeSub?.billingInterval ?? null) as BillingInterval | null,
  };
}

// ─── Action ───────────────────────────────────────────────────────────────────

export async function action({ request, params, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrgBySlug(db, request, params.orgSlug);
  const env = getEnv();
  const formData = await request.formData();
  const intentResult = z
    .enum(["dodo-checkout", "dodo-change-plan", "dodo-cancel", "dodo-resume"])
    .safeParse(formData.get("intent"));
  if (!intentResult.success) return { ok: false, error: "Invalid intent" };
  const intent = intentResult.data;
  const returnUrl = `${env.BASE_URL}${new URL(request.url).pathname.replace(/\.data$/, "")}`;

  const dodoProductIds = {
    starter: {
      monthly: env.DODO_STARTER_MONTHLY_PRODUCT_ID ?? "",
      annual: env.DODO_STARTER_ANNUAL_PRODUCT_ID ?? "",
    },
    professional: {
      monthly: env.DODO_PRO_MONTHLY_PRODUCT_ID ?? "",
      annual: env.DODO_PRO_ANNUAL_PRODUCT_ID ?? "",
    },
  };

  if (intent === "dodo-checkout") {
    const planResult = z.enum(["starter", "professional"]).safeParse(formData.get("plan"));
    const intervalResult = z.enum(["monthly", "annual"]).safeParse(formData.get("interval"));
    if (!planResult.success || !intervalResult.success)
      return { ok: false, error: "Invalid plan or interval" };
    const plan = planResult.data;
    const interval = intervalResult.data;
    const productId = dodoProductIds[plan]?.[interval];
    if (!productId) return { ok: false, error: "Product not configured" };

    const result = await createDodoCheckoutSession({
      productId,
      organizationId,
      returnUrl,
    });
    if ("error" in result) return { ok: false, error: result.error };
    return redirect(result.url);
  }

  if (intent === "dodo-change-plan") {
    const planResult = z.enum(["starter", "professional"]).safeParse(formData.get("plan"));
    const intervalResult = z.enum(["monthly", "annual"]).safeParse(formData.get("interval"));
    if (!planResult.success || !intervalResult.success)
      return { ok: false, error: "Invalid plan or interval" };
    const plan = planResult.data;
    const interval = intervalResult.data;
    const productId = dodoProductIds[plan]?.[interval];
    if (!productId) return { ok: false, error: "Product not configured" };

    const activeSub = await db.query.subscription.findFirst({
      where: and(
        eq(subscription.referenceId, organizationId),
        or(
          eq(subscription.status, "active"),
          eq(subscription.status, "trialing"),
          eq(subscription.status, "past_due"),
        ),
      ),
      columns: { dodoSubscriptionId: true },
    });
    if (!activeSub?.dodoSubscriptionId)
      return { ok: false, error: "No active Dodo subscription found" };

    const result = await changeDodoPlan({
      dodoSubscriptionId: activeSub.dodoSubscriptionId,
      productId,
    });
    if (result.error) return { ok: false, error: result.error };

    // DB state is updated authoritatively by onSubscriptionUpdated webhook | do not write here.
    return redirect(returnUrl);
  }

  if (intent === "dodo-cancel") {
    const activeSub = await db.query.subscription.findFirst({
      where: and(
        eq(subscription.referenceId, organizationId),
        or(
          eq(subscription.status, "active"),
          eq(subscription.status, "trialing"),
          eq(subscription.status, "past_due"),
        ),
      ),
      columns: { dodoSubscriptionId: true },
    });
    if (!activeSub?.dodoSubscriptionId)
      return { ok: false, error: "No active Dodo subscription found" };

    const result = await cancelDodoSubscription(activeSub.dodoSubscriptionId);
    if (result.error) return { ok: false, error: result.error };

    await db
      .update(subscription)
      .set({ cancelAtPeriodEnd: true })
      .where(eq(subscription.dodoSubscriptionId, activeSub.dodoSubscriptionId));
    return redirect(returnUrl);
  }

  if (intent === "dodo-resume") {
    const activeSub = await db.query.subscription.findFirst({
      where: and(
        eq(subscription.referenceId, organizationId),
        or(eq(subscription.status, "active"), eq(subscription.status, "trialing")),
      ),
      columns: { dodoSubscriptionId: true },
    });
    if (!activeSub?.dodoSubscriptionId)
      return { ok: false, error: "No active subscription found" };

    const result = await resumeDodoSubscription(activeSub.dodoSubscriptionId);
    if (result.error) return { ok: false, error: result.error };

    await db
      .update(subscription)
      .set({ cancelAtPeriodEnd: false })
      .where(eq(subscription.dodoSubscriptionId, activeSub.dodoSubscriptionId));
    return redirect(returnUrl);
  }

  return { ok: false, error: "Unknown intent" };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function planFromSub(planName: string | null | undefined): PlanId {
  if (!planName) return "free";
  const lower = planName.toLowerCase();
  if (lower === "starter") return "starter";
  if (lower === "professional") return "professional";
  return "free";
}

function formatDate(date: Date | null | undefined) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BillingSettings({ loaderData }: Route.ComponentProps) {
  const { subscription: activeSub, currentBillingInterval } = loaderData;

  const fetcher = useFetcher();

  const currentPlan = planFromSub(activeSub?.plan);
  const isTrialing = activeSub?.status === "trialing";
  const isPastDue = activeSub?.status === "past_due";
  const isCancelingAtPeriodEnd = activeSub?.cancelAtPeriodEnd === true;
  const hasManagedSub = Boolean(activeSub?.dodoSubscriptionId);

  // Composite key so polling stops when plan OR cancelAtPeriodEnd changes.
  const subState = `${currentPlan}:${isCancelingAtPeriodEnd}`;

  const { startPoll } = useBillingPoll({ subState, fetcherState: fetcher.state });

  // Detect return from external Dodo checkout via sessionStorage flag.
  useEffect(() => {
    const raw = sessionStorage.getItem("dodo-checkout-pending");
    if (!raw) return;
    sessionStorage.removeItem("dodo-checkout-pending");
    try {
      const { plan, ts } = JSON.parse(raw) as { plan: string; ts: number };
      const isRecent = Date.now() - ts < 15 * 60 * 1000;
      if (!isRecent || currentPlan === plan) return;
      startPoll();
    } catch {
      // Corrupted flag | ignore silently.
    }
  }, [startPoll, currentPlan]);

  const [billingInterval, setBillingInterval] = useState<BillingInterval>("annual");
  const [dodoPortalLoading, setDodoPortalLoading] = useState(false);

  const isSubmitting = fetcher.state !== "idle" || dodoPortalLoading;
  const actionError =
    fetcher.data && "error" in fetcher.data ? (fetcher.data as { error: string }).error : null;

  function intervalForPlanChange(): BillingInterval {
    return currentBillingInterval ?? billingInterval;
  }

  async function handlePortal() {
    setDodoPortalLoading(true);
    const { data, error } = await authClient.dodopayments.customer.portal();
    setDodoPortalLoading(false);
    if (error || !data) return;
    if ("url" in data) window.location.href = data.url as string;
  }

  function handleCheckout(planId: Exclude<PlanId, "free">) {
    sessionStorage.setItem(
      "dodo-checkout-pending",
      JSON.stringify({ plan: planId, ts: Date.now() }),
    );
    fetcher.submit(
      { intent: "dodo-checkout", plan: planId, interval: billingInterval },
      { method: "POST" },
    );
  }

  function handleChangePlan(planId: PlanId) {
    if (planId === "free") {
      fetcher.submit({ intent: "dodo-cancel", plan: "free" }, { method: "POST" });
    } else {
      fetcher.submit(
        { intent: "dodo-change-plan", plan: planId, interval: intervalForPlanChange() },
        { method: "POST" },
      );
    }
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4" />

      <main className="px-6 pt-2 pb-6 max-w-[1080px] mx-auto w-full space-y-8">
        <PageHeader title="Billing & Plans" icon={CreditCard} />

        {/* Error alert */}
        {actionError && (
          <Alert variant="destructive">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        {/* Current plan status */}
        {activeSub && (
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium capitalize">
                    {activeSub.plan} plan
                    {activeSub.billingInterval && (
                      <span className="ml-1 font-normal text-muted-foreground">
                        · {activeSub.billingInterval}
                      </span>
                    )}
                  </span>
                  {isTrialing && (
                    <Badge variant="secondary">
                      <SparklesIcon className="mr-1 h-3 w-3" />
                      Trial
                    </Badge>
                  )}
                  {isPastDue && <Badge variant="destructive">Past due</Badge>}
                  {isCancelingAtPeriodEnd && <Badge variant="outline">Cancels soon</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isTrialing && activeSub.trialEnd
                    ? `Trial ends ${formatDate(activeSub.trialEnd)}`
                    : isCancelingAtPeriodEnd
                      ? `Access until ${formatDate(activeSub.cancelAt ?? activeSub.periodEnd)} | then moves to Free`
                      : activeSub.periodEnd
                        ? `Renews on ${formatDate(activeSub.periodEnd)}`
                        : null}
                </p>
                {isPastDue && (
                  <p className="mt-1.5 text-xs text-destructive font-medium">
                    Your last payment failed. Update your payment method to keep access.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isCancelingAtPeriodEnd && hasManagedSub && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() =>
                      fetcher.submit({ intent: "dodo-resume" }, { method: "POST" })
                    }
                  >
                    {fetcher.formData?.get("intent") === "dodo-resume"
                      ? "Resuming…"
                      : "Resume subscription"}
                  </Button>
                )}
                {isPastDue && hasManagedSub && (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isSubmitting}
                    onClick={handlePortal}
                  >
                    <ExternalLinkIcon className="mr-1.5 h-3.5 w-3.5" />
                    {isSubmitting && dodoPortalLoading ? "Opening…" : "Update payment"}
                  </Button>
                )}
                {hasManagedSub && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={handlePortal}
                  >
                    <ExternalLinkIcon className="mr-1.5 h-3.5 w-3.5" />
                    {isSubmitting && dodoPortalLoading ? "Opening…" : "Manage billing"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Billing interval toggle */}
        <BillingToggle
          value={billingInterval}
          onChange={setBillingInterval}
          disabled={hasManagedSub}
          note={
            hasManagedSub
              ? `Plan changes keep your current ${currentBillingInterval} billing cycle.`
              : undefined
          }
        />

        {/* Plan cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isHigherPlan = PLAN_RANK[plan.id] > PLAN_RANK[currentPlan];
            const isLowerPlan = PLAN_RANK[plan.id] < PLAN_RANK[currentPlan];
            const isPro = plan.id === "professional";
            const loading = isSubmitting && fetcher.formData?.get("plan") === plan.id;

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                billingInterval={billingInterval}
                highlighted={isCurrent || isPro}
                badge={
                  isCurrent
                    ? { label: "Current plan", color: "primary" }
                    : isPro
                      ? { label: "Most popular", color: "orange" }
                      : undefined
                }
                renderAction={() => {
                  if (isCurrent) {
                    return (
                      <Button variant="outline" size="sm" disabled className="w-full">
                        Current plan
                      </Button>
                    );
                  }
                  if (isHigherPlan && plan.id !== "free") {
                    return (
                      <Button
                        size="sm"
                        className={`w-full ${isPro ? "bg-orange-500 text-white hover:bg-orange-600" : ""}`}
                        disabled={loading || isSubmitting || isPastDue}
                        title={
                          isPastDue
                            ? "Resolve your failed payment before changing plans"
                            : undefined
                        }
                        onClick={() =>
                          hasManagedSub
                            ? handleChangePlan(plan.id as PlanId)
                            : handleCheckout(plan.id as Exclude<PlanId, "free">)
                        }
                      >
                        {loading ? "Processing…" : `Upgrade to ${isPro ? "Pro" : plan.name}`}
                      </Button>
                    );
                  }
                  if (isLowerPlan) {
                    return (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={
                          loading ||
                          isSubmitting ||
                          (plan.id === "free" && isCancelingAtPeriodEnd) ||
                          isPastDue
                        }
                        title={
                          isPastDue
                            ? "Resolve your failed payment before changing plans"
                            : undefined
                        }
                        onClick={() => handleChangePlan(plan.id as PlanId)}
                      >
                        {loading ? "Processing…" : "Downgrade"}
                      </Button>
                    );
                  }
                  return <div className="h-9" />;
                }}
              />
            );
          })}
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {TRUST_BADGES.map((badge) => (
            <span
              key={badge}
              className="flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <CheckIcon className="h-3 w-3 text-primary" />
              {badge}
            </span>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          All plans are billed in USD via Dodo Payments. You can upgrade, downgrade, or cancel at
          any time.
        </p>
      </main>
    </>
  );
}
