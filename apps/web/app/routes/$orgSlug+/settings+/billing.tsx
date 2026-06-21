import { PageHeader } from "@components/common/page-header";
import { Alert, AlertDescription } from "@components/ui/alert";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { requireOrgBySlug } from "@features/auth/server/guards";
import {
  cancelDodoSubscription,
  changeDodoPlan,
  createDodoCheckoutSession,
} from "@features/internal/billing/server/dodo";
import { authClient } from "@lib/auth/client";
import { getEnv } from "@utils/get-env";
import { and, desc, eq, or } from "drizzle-orm";
import { CheckIcon, CreditCard, ExternalLinkIcon, SparklesIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { redirect, useFetcher, useRevalidator, useSearchParams } from "react-router";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { getDb } from "@/db";
import { subscription } from "@/db/schema";

import type { Route } from "./+types/billing";

export function meta() {
  return [{ title: "Billing — Feeduro" }];
}

// ─── Plan definitions ─────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "free",
    name: "Free Forever",
    monthly: "$0",
    annual: "$0",
    description: "Perfect for getting started with customer feedback",
    features: [
      "Feedback with voting and comments",
      "Unlimited users",
      "No limits on feedback",
      "Public changelog",
      "Public roadmap",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    monthly: "$12",
    annual: "$8",
    description: "Perfect for small teams and growing startups",
    features: ["Everything in Free", "5 feedback boards", "Private boards", "Guest posting"],
  },
  {
    id: "professional",
    name: "Professional",
    monthly: "$18",
    annual: "$14",
    description: "Built for teams that need unlimited everything",
    features: [
      "Everything in Starter",
      "Unlimited boards",
      "Custom domain",
      "White-label branding",
      "Unlimited admin roles",
      "Unlimited integrations",
      "Single Sign-On (SSO)",
      "Advanced search & filters",
    ],
  },
] as const;

type PlanId = (typeof PLANS)[number]["id"];
type BillingInterval = "monthly" | "annual";

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request, params }: Route.LoaderArgs) {
  const { organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const activeSub = await db.query.subscription.findFirst({
    where: and(
      eq(subscription.referenceId, organizationId),
      or(
        eq(subscription.status, "active"),
        eq(subscription.status, "trialing"),
        eq(subscription.status, "past_due"),
      ),
    ),
    orderBy: desc(subscription.periodEnd),
  });

  return {
    subscription: activeSub ?? null,
    currentBillingInterval: (activeSub?.billingInterval ?? null) as BillingInterval | null,
  };
}

// ─── Action ───────────────────────────────────────────────────────────────────

export async function action({ request, params }: Route.ActionArgs) {
  const { organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const env = getEnv();
  const db = getDb();
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const returnUrl = `${new URL(request.url).origin}${new URL(request.url).pathname}`;

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
    const plan = formData.get("plan") as Exclude<PlanId, "free">;
    const interval = formData.get("interval") as BillingInterval;
    const productId = dodoProductIds[plan]?.[interval];
    if (!productId) return { ok: false, error: "Product not configured" };

    const result = await createDodoCheckoutSession({
      productId,
      organizationId,
      returnUrl: `${returnUrl}?upgraded=true`,
    });
    if ("error" in result) return { ok: false, error: result.error };
    return redirect(result.url);
  }

  if (intent === "dodo-change-plan") {
    const plan = formData.get("plan") as Exclude<PlanId, "free">;
    const interval = formData.get("interval") as BillingInterval;
    const productId = dodoProductIds[plan]?.[interval];
    if (!productId) return { ok: false, error: "Product not configured" };

    const activeSub = await db.query.subscription.findFirst({
      where: and(
        eq(subscription.referenceId, organizationId),
        or(eq(subscription.status, "active"), eq(subscription.status, "trialing")),
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

    await db
      .update(subscription)
      .set({ plan, billingInterval: interval })
      .where(eq(subscription.dodoSubscriptionId, activeSub.dodoSubscriptionId));
    return redirect(`${returnUrl}?upgraded=true`);
  }

  if (intent === "dodo-cancel") {
    const activeSub = await db.query.subscription.findFirst({
      where: and(
        eq(subscription.referenceId, organizationId),
        or(eq(subscription.status, "active"), eq(subscription.status, "trialing")),
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
    return redirect(`${returnUrl}?upgraded=true`);
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

  const [searchParams] = useSearchParams();
  const justUpgraded = searchParams.get("upgraded") === "true";
  const { revalidate, state } = useRevalidator();
  const fetcher = useFetcher();

  const pollCountRef = useRef(0);

  // Poll until the webhook has been processed and the subscription row appears (max 10 retries = 20s)
  useEffect(() => {
    if (!justUpgraded || activeSub) {
      pollCountRef.current = 0;
      return;
    }
    if (state === "loading") return;
    if (pollCountRef.current >= 10) return;
    pollCountRef.current++;
    const id = setTimeout(revalidate, 2000);
    return () => clearTimeout(id);
  }, [justUpgraded, activeSub, state, revalidate]);

  const currentPlan = planFromSub(activeSub?.plan);
  const isTrialing = activeSub?.status === "trialing";
  const isPastDue = activeSub?.status === "past_due";
  const isCancelingAtPeriodEnd = activeSub?.cancelAtPeriodEnd === true;
  const hasManagedSub = Boolean(activeSub?.dodoSubscriptionId);

  const [billingInterval, setBillingInterval] = useState<BillingInterval>("annual");
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
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
    setLoadingPlan(planId);
    fetcher.submit(
      { intent: "dodo-checkout", plan: planId, interval: billingInterval },
      { method: "POST" },
    );
  }

  function handleChangePlan(planId: PlanId) {
    if (planId === "free") {
      setLoadingPlan("free");
      fetcher.submit({ intent: "dodo-cancel", plan: "free" }, { method: "POST" });
    } else {
      setLoadingPlan(planId);
      fetcher.submit(
        { intent: "dodo-change-plan", plan: planId, interval: intervalForPlanChange() },
        { method: "POST" },
      );
    }
  }

  return (
        <>
        <header className="flex h-14 shrink-0 items-center px-4">
          <SidebarTrigger className="-ml-1" />
        </header>

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
          <PageHeader title="Billing & Plans" icon={CreditCard} />

          {/* Success banner */}
          {justUpgraded && (
            <Alert variant="success" className="mb-6">
              <CheckIcon className="h-4 w-4 shrink-0" />
              <AlertDescription>Your plan has been updated successfully.</AlertDescription>
            </Alert>
          )}

          {/* Error alert */}
          {actionError && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}

          {/* Current plan status */}
          {activeSub && (
            <div className="mb-8 rounded-lg border p-4">
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
                        ? `Access until ${formatDate(activeSub.cancelAt ?? activeSub.periodEnd)} — then moves to Free`
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
          <div className="mb-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setBillingInterval("monthly")}
              className={`text-sm font-medium transition-colors ${
                billingInterval === "monthly"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={billingInterval === "annual"}
              onClick={() => setBillingInterval((i) => (i === "monthly" ? "annual" : "monthly"))}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                billingInterval === "annual" ? "bg-primary" : "bg-input"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg transition-transform ${
                  billingInterval === "annual" ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval("annual")}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                billingInterval === "annual"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                Save ~33%
              </span>
            </button>
          </div>

          {/* Plan cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {PLANS.map((plan) => {
              const isCurrent = currentPlan === plan.id;
              const planRank = { free: 0, starter: 1, professional: 2 };
              const isHigherPlan = planRank[plan.id] > planRank[currentPlan];
              const isLowerPlan = planRank[plan.id] < planRank[currentPlan];
              const loading =
                loadingPlan === plan.id ||
                (isSubmitting && fetcher.formData?.get("plan") === plan.id);

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-lg border p-5 ${
                    isCurrent ? "border-primary ring-1 ring-primary" : "border-border"
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-2.5 left-4 bg-background px-2 text-xs font-medium text-primary">
                      Current plan
                    </span>
                  )}
                  {plan.id === "professional" && !isCurrent && (
                    <span className="absolute -top-2.5 left-4 bg-background px-2 text-xs font-medium text-primary">
                      Most popular
                    </span>
                  )}

                  <div className="mb-4">
                    <h2 className="text-base font-semibold">{plan.name}</h2>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-bold">
                        {billingInterval === "annual" ? plan.annual : plan.monthly}
                      </span>
                      {plan.id !== "free" && (
                        <span className="text-xs text-muted-foreground">/mo</span>
                      )}
                    </div>
                    {plan.id !== "free" && billingInterval === "annual" && (
                      <p className="text-xs text-muted-foreground">billed annually</p>
                    )}
                    <p className="mt-1.5 text-xs text-muted-foreground">{plan.description}</p>
                  </div>

                  <ul className="mb-6 flex-1 space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button variant="outline" size="sm" disabled>
                      Current plan
                    </Button>
                  ) : isHigherPlan && plan.id !== "free" ? (
                    <Button
                      size="sm"
                      disabled={loading || isSubmitting}
                      onClick={() =>
                        hasManagedSub
                          ? handleChangePlan(plan.id as PlanId)
                          : handleCheckout(plan.id as Exclude<PlanId, "free">)
                      }
                    >
                      {loading ? "Processing…" : `Upgrade to ${plan.id === "professional" ? "Pro" : plan.name}`}
                    </Button>
                  ) : isLowerPlan ? (
                    plan.id === "free" && isCancelingAtPeriodEnd ? (
                      <Button variant="outline" size="sm" disabled>
                        Cancellation scheduled
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loading || isSubmitting}
                        onClick={() => handleChangePlan(plan.id as PlanId)}
                      >
                        {loading ? "Processing…" : "Downgrade"}
                      </Button>
                    )
                  ) : null}
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            All plans are billed in USD via Dodo Payments. You can upgrade, downgrade, or cancel at
            any time.
          </p>
        </main>
        </>
  );
}
