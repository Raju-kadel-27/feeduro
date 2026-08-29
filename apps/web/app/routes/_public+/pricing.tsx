import { BillingToggle } from "@components/pricing/billing-toggle";
import { PlanCard } from "@components/pricing/plan-card";
import { type BillingInterval, PLANS, TRUST_BADGES } from "@components/pricing/plans";
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
    { title: "Pricing | Feeduro" },
    { name: "description", content: "Simple, transparent pricing for teams of all sizes." },
  ];
}

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
          <div className="mb-8">
            <BillingToggle value={billingInterval} onChange={setBillingInterval} />
          </div>

          {/* Plan cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                billingInterval={billingInterval}
                highlighted={plan.popular}
                badge={plan.popular ? { label: "Most popular", color: "orange" } : undefined}
                renderAction={(p) => (
                  <Button
                    asChild
                    size="sm"
                    className={`w-full${p.id === "professional" ? " bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
                    variant={p.id === "free" ? "outline" : "default"}
                  >
                    <Link to="/sign-in">{p.cta}</Link>
                  </Button>
                )}
              />
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
