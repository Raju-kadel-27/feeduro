import { CheckIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { BillingInterval, Plan } from "./plans";

type PlanCardProps = {
  plan: Plan;
  billingInterval: BillingInterval;
  highlighted?: boolean;
  badge?: { label: string; color: "primary" | "orange" };
  renderAction: (plan: Plan) => ReactNode;
};

export function PlanCard({
  plan,
  billingInterval,
  highlighted,
  badge,
  renderAction,
}: PlanCardProps) {
  return (
    <div
      className={`relative flex flex-col rounded-xl border p-6 ${
        highlighted
          ? "border-primary bg-primary/[0.02] ring-1 ring-primary"
          : "border-border"
      }`}
    >
      {badge && (
        <span
          className={`absolute -top-2.5 left-4 bg-background px-2 text-xs font-medium ${
            badge.color === "orange" ? "text-orange-500" : "text-primary"
          }`}
        >
          {badge.label}
        </span>
      )}

      <div className="mb-3 min-h-[4.5rem]">
        <h2 className="text-lg font-semibold">{plan.name}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{plan.tagline}</p>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">
            ${billingInterval === "annual" ? plan.annual : plan.monthly}
          </span>
          {plan.id !== "free" && (
            <span className="text-sm text-muted-foreground">/mo</span>
          )}
        </div>
        <p
          className={`mt-0.5 text-sm text-muted-foreground ${plan.id === "free" ? "invisible" : ""}`}
        >
          {billingInterval === "annual"
            ? `billed annually, save $${plan.annualSaving}/yr`
            : "billed monthly"}
        </p>
      </div>

      <div className="mb-1">{renderAction(plan)}</div>

      <p
        className={`mb-4 text-center text-[11px] text-muted-foreground ${plan.id !== "free" ? "invisible" : ""}`}
      >
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
  );
}
