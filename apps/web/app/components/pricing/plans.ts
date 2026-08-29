export type PlanId = "free" | "starter" | "professional";
export type BillingInterval = "monthly" | "annual";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  monthly: number;
  annual: number;
  annualSaving: number;
  cta: string;
  popular: boolean;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free Forever",
    tagline: "Solo founders & early teams",
    monthly: 0,
    annual: 0,
    annualSaving: 0,
    cta: "Start for free",
    popular: false,
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
    popular: false,
    features: [
      "Everything in Free",
      "5 feedback boards",
      "Private boards",
      "Guest posting",
      "Integrations",
      "Comment summaries",
      "AI-assisted insights",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "Teams serious about closing the loop",
    monthly: 18,
    annual: 14,
    annualSaving: 48,
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

export const TRUST_BADGES = [
  "No credit card required",
  "Cancel or downgrade anytime",
  "GDPR compliant",
  "Your data, always yours",
];
