import { and, desc, eq, or } from "drizzle-orm";
import { data } from "react-router";
import type { Db } from "@/db";
import { subscription } from "@/db/schema";

export type PlanLimits = {
  boards: number;       // -1 = unlimited
  privateBoards: boolean;
  guestPosting: boolean;
  hidePoweredBy: boolean;
  customDomain: boolean;
  analytics: boolean;
  team: boolean;
  integrations: number; // -1 = unlimited, 0 = none
  webhooks: number;     // -1 = unlimited, 0 = none
  apiTokens: number;    // -1 = unlimited, 0 = none
  oauthClients: boolean;
  sso: boolean;
  customRoles: boolean;
  segments: boolean;
  auditLog: boolean;
  savedViews: number;   // -1 = unlimited, 0 = none
};

export type PlanGatedFeature = keyof PlanLimits;

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    boards: 2,
    privateBoards: false,
    guestPosting: false,
    hidePoweredBy: false,
    customDomain: false,
    analytics: false,
    team: false,
    integrations: 0,
    webhooks: 0,
    apiTokens: -1,
    oauthClients: true,
    sso: false,
    customRoles: false,
    segments: false,
    auditLog: false,
    savedViews: -1,
  },
  starter: {
    boards: 5,
    privateBoards: true,
    guestPosting: true,
    hidePoweredBy: false,
    customDomain: false,
    analytics: true,
    team: true,
    integrations: 3,
    webhooks: -1,
    apiTokens: -1,
    oauthClients: true,
    sso: false,
    customRoles: false,
    segments: false,
    auditLog: false,
    savedViews: -1,
  },
  professional: {
    boards: -1,
    privateBoards: true,
    guestPosting: true,
    hidePoweredBy: true,
    customDomain: true,
    analytics: true,
    team: true,
    integrations: -1,
    webhooks: -1,
    apiTokens: -1,
    oauthClients: true,
    sso: true,
    customRoles: true,
    segments: true,
    auditLog: true,
    savedViews: -1,
  },
};

export const FEATURE_REQUIRED_PLAN: Partial<Record<PlanGatedFeature, "starter" | "professional">> = {
  boards: "starter",
  privateBoards: "starter",
  guestPosting: "starter",
  analytics: "starter",
  team: "starter",
  integrations: "starter",
  webhooks: "starter",
  hidePoweredBy: "professional",
  customDomain: "professional",
  sso: "professional",
  customRoles: "professional",
  segments: "professional",
  auditLog: "professional",
};

export async function getOrgPlanLimits(db: Db, organizationId: string): Promise<PlanLimits> {
  const activeSub = await db.query.subscription.findFirst({
    where: and(
      eq(subscription.referenceId, organizationId),
      or(
        eq(subscription.status, "active"),
        eq(subscription.status, "trialing"),
        eq(subscription.status, "past_due"),
      ),
    ),
    columns: { plan: true },
    orderBy: [desc(subscription.periodEnd)],
  });

  const plan = activeSub?.plan?.toLowerCase() ?? "free";
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

// Returns a 403 data response if the feature is locked on the current plan, null if allowed.
// Pass `current` for count-based features to check against the limit.
export function planGateResponse(
  limits: PlanLimits,
  feature: PlanGatedFeature,
  current?: number,
) {
  const value = limits[feature];
  const requiredPlan = FEATURE_REQUIRED_PLAN[feature];
  const planLabel = requiredPlan === "starter" ? "Starter" : "Professional";

  if (value === false || value === 0) {
    return data({ error: `Upgrade to ${planLabel} to use this feature.` }, { status: 403 });
  }
  if (typeof value === "number" && value !== -1 && current !== undefined && current >= value) {
    return data(
      { error: `Your plan allows ${value}. Upgrade to ${planLabel} for more.` },
      { status: 403 },
    );
  }
  return null;
}
