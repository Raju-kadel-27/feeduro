import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { subscription } from "@/db/schema";

export type PlanLimits = {
  boards: number; // -1 = unlimited
  privateBoards: boolean;
  guestPosting: boolean;
};

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: { boards: 2, privateBoards: false, guestPosting: false },
  starter: { boards: 5, privateBoards: true, guestPosting: true },
  professional: { boards: -1, privateBoards: true, guestPosting: true },
};

export async function getOrgPlanLimits(organizationId: string): Promise<PlanLimits> {
  const db = getDb();

  const activeSub = await db.query.subscription.findFirst({
    where: and(
      eq(subscription.referenceId, organizationId),
      or(eq(subscription.status, "active"), eq(subscription.status, "trialing")),
    ),
    columns: { plan: true },
  });

  const plan = activeSub?.plan?.toLowerCase() ?? "free";
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}
