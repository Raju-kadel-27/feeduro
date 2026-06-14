import { Button } from "@components/ui/button";
import { LandingFooter } from "@features/public/landing/components/landing-footer";
import { LandingNav } from "@features/public/landing/components/landing-nav";
import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

export function meta() {
  return [
    { title: "Pricing — Feeduro" },
    { name: "description", content: "Simple, transparent pricing for teams of all sizes." },
  ];
}

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

type BillingInterval = "monthly" | "annual";

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("annual");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />

      <div className="relative overflow-hidden pt-32 pb-20">
        {/* Grid-lines background */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(148 163 184 / 0.04)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e\")",
          }}
        />
        {/* Glow blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full"
            style={{ background: "rgba(59,130,246,0.12)", filter: "blur(120px)" }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-[900px] px-4 w-full">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Simple, transparent pricing</h1>
          <p className="mt-2 text-muted-foreground">
            Start free. Upgrade when your team needs more.
          </p>
        </div>

        {/* Billing interval toggle */}
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
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
              Save ~33%
            </span>
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-lg border p-5 ${
                plan.id === "professional" ? "border-primary ring-1 ring-primary" : "border-border"
              }`}
            >
              {plan.id === "professional" && (
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

              <Button
                asChild
                size="sm"
                variant={plan.id === "free" ? "outline" : "default"}
              >
                <Link to="/sign-in">
                  {plan.id === "free"
                    ? "Get started free"
                    : `Upgrade to ${plan.id === "professional" ? "Pro" : plan.name}`}
                </Link>
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          All plans are billed in USD. You can upgrade, downgrade, or cancel at any time.
        </p>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
