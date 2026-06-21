import { and, desc, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { subscription } from "@/db/schema";

export type PlanLimits = {
  boards: number; // -1 = unlimited
  privateBoards: boolean;
  guestPosting: boolean;
  hidePoweredBy: boolean;
};

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: { boards: 2, privateBoards: false, guestPosting: false, hidePoweredBy: false },
  starter: { boards: 5, privateBoards: true, guestPosting: true, hidePoweredBy: false },
  professional: { boards: -1, privateBoards: true, guestPosting: true, hidePoweredBy: true },
};

export async function getOrgPlanLimits(organizationId: string): Promise<PlanLimits> {
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
    columns: { plan: true },
    orderBy: [desc(subscription.periodEnd)],
  });

  const plan = activeSub?.plan?.toLowerCase() ?? "free";
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}
