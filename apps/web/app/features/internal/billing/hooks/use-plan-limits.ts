import type { PlanLimits } from "@features/internal/billing/server/plan-limits";
import { useRouteLoaderData } from "react-router";

export function usePlanLimits(): PlanLimits | null {
	const data = useRouteLoaderData("routes/$orgSlug+/_layout") as
		| { planLimits?: PlanLimits }
		| undefined;
	return data?.planLimits ?? null;
}
