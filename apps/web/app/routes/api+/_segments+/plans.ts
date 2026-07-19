import { requireOrganization } from "@features/auth/server/guards";
import { PlanActionSchema } from "@features/internal/segmentation/schemas/plan";
import {
  createPlan,
  deletePlan,
  getOrgPlans,
  updatePlan,
} from "@features/internal/segmentation/server/service";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/plans";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);
  const plans = await getOrgPlans(db, organizationId);
  return data({ plans });
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);

  const memberRecord = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
    columns: { role: true },
  });
  if (memberRecord?.role !== "admin") {
    return data({ error: "Only admins can manage plans" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return data({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PlanActionSchema.safeParse(body);
  if (!parsed.success) {
    return data({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const action = parsed.data;

  try {
    if (action.intent === "create") {
      const id = await createPlan(db, organizationId, {
        name: action.name,
        monthlyPrice: action.monthlyPrice,
        annualMonthlyPrice: action.annualMonthlyPrice,
        interval: action.interval,
      });
      return data({ success: true, id });
    }

    if (action.intent === "update") {
      await updatePlan(db, organizationId, action.id, {
        name: action.name,
        monthlyPrice: action.monthlyPrice,
        annualMonthlyPrice: action.annualMonthlyPrice,
        interval: action.interval,
      });
      return data({ success: true });
    }

    await deletePlan(db, organizationId, action.id);
    return data({ success: true });
  } catch {
    // Most likely a duplicate plan name (unique per org).
    return data({ error: "A plan with that name already exists" }, { status: 409 });
  }
}
