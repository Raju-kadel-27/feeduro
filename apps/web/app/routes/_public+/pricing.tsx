import { Button } from "@components/ui/button";
import { LandingFooter } from "@features/public/landing/components/landing-footer";
import { LandingNav } from "@features/public/landing/components/landing-nav";
import { PricingComparison } from "@features/public/landing/components/pricing-comparison";
import { PricingFaq } from "@features/public/landing/components/pricing-faq";
import { Building2Icon, CheckIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

export function meta() {
  return [
    { title: "Pricing — Feeduro" },
    { name: "description", content: "Simple, transparent pricing for teams of all sizes." },
  ];
}

type Plan = {
  id: string;
  name: string;
  tagline: string;
  monthly: number;
  annual: number;
  annualSaving: number;
  cta: string;
  popular?: boolean;
  features: string[];
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free Forever",
    tagline: "Solo founders & early teams",
    monthly: 0,
    annual: 0,
    annualSaving: 0,
    cta: "Start for free",
    features: [
      "2 feedback boards",
      "Feedback with voting & comments",
      "Unlimited voters & users",
      "Unlimited feedback posts",
      "Public changelog",
      "Public roadmap",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "Growing teams & startups",
    monthly: 12,
    annual: 8,
    annualSaving: 48,
    cta: "Upgrade to Starter",
    features: ["Everything in Free", "5 feedback boards", "Private boards", "Guest posting", "Integrations", "Comment summaries", "AI-assisted insights"],
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "Teams serious about closing the loop",
    monthly: 24,
    annual: 18,
    annualSaving: 72,
    cta: "Upgrade to Pro",
    popular: true,
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
];

const TRUST_BADGES = [
  "No credit card required to start",
  "Cancel or downgrade anytime",
  "GDPR compliant",
  "Your data, always yours",
];

type BillingInterval = "monthly" | "annual";

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("annual");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />

      <div className="relative overflow-hidden pb-20 pt-32">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(148 163 184 / 0.04)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e\")",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full"
            style={{ background: "rgba(59,130,246,0.12)", filter: "blur(120px)" }}
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[1080px] px-4">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Early-access pricing: annual subscribers lock in this rate for life
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Pricing that grows with you</h1>
            <p className="mx-auto mt-3 max-w-sm text-muted-foreground">
              Every plan includes unlimited users and unlimited feedback. Upgrade for more boards,
              integrations, and white-label.
            </p>
          </div>

          {/* Billing toggle */}
          <div className="mb-8 flex items-center justify-center gap-3">
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
              <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-500 border border-orange-200">
                Save up to 33%
              </span>
            </button>
          </div>

          {/* Plan cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-xl border p-6 ${
                  plan.popular
                    ? "border-primary bg-primary/[0.02] ring-1 ring-primary"
                    : "border-border"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 left-4 bg-background px-2 text-xs font-medium text-orange-500">
                    Most popular
                  </span>
                )}

                <div className="mb-3 min-h-[5rem]">
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">{plan.tagline}</p>
                </div>
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      ${billingInterval === "annual" ? plan.annual : plan.monthly}
                    </span>
                    <span className={`text-sm text-muted-foreground ${plan.id === "free" ? "invisible" : ""}`}>
                      /mo
                    </span>
                  </div>
                  <p className={`mt-0.5 text-sm text-muted-foreground ${plan.id === "free" ? "invisible" : ""}`}>
                    {billingInterval === "annual"
                      ? `billed annually, save $${plan.annualSaving}/yr`
                      : "billed monthly"}
                  </p>
                </div>

                <Button
                  asChild
                  size="sm"
                  className={`mb-1 ${plan.id === "professional" ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
                  variant={plan.id === "free" ? "outline" : "default"}
                >
                  <Link to="/sign-in">{plan.cta}</Link>
                </Button>

                <p className={`mb-4 text-center text-[11px] text-muted-foreground ${plan.id !== "free" ? "invisible" : ""}`}>
                  No credit card required
                </p>

                <div className="mb-4 h-px bg-border" />

                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {TRUST_BADGES.map((badge) => (
              <span key={badge} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckIcon className="h-3 w-3 text-primary" />
                {badge}
              </span>
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            All prices in USD. Switch plans or cancel anytime.
          </p>
        </div>
      </div>

      <PricingComparison />

      {/* Enterprise CTA */}
      <section className="mx-auto max-w-[1080px] px-4 pb-16">
        <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium">
            <Building2Icon className="h-3.5 w-3.5" />
            Enterprise
          </div>
          <h2 className="mt-3 text-xl font-bold">Your team needs more?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Custom contracts, dedicated onboarding, SLA guarantees, invoice billing, and SSO
            configuration help. Let's build the right plan together.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link to="mailto:support.feeduro@gmail.com">Talk to us</Link>
            </Button>
          </div>
        </div>
      </section>

      <PricingFaq />

      <LandingFooter />
    </div>
  );
}
