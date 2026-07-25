import { PageTransition } from "@components/page-transition";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import { AppShell } from "@features/internal/layout/components/app-shell";
import { Outlet, useMatches } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/_layout";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrgBySlug(db, request, params.orgSlug);
  const planLimits = await getOrgPlanLimits(db, organizationId);
  return { planLimits };
}

export function shouldRevalidate({
  currentParams,
  nextParams,
  formMethod,
  defaultShouldRevalidate,
}: Route.ShouldRevalidateArgs) {
  // planLimits only changes after a mutation (billing actions) — skip re-running
  // the layout loader on plain tab-switch navigations within the same org.
  if (formMethod) return defaultShouldRevalidate;
  return currentParams.orgSlug !== nextParams.orgSlug;
}

export default function OrgLayout() {
  const matches = useMatches();
  const hideSidebar = matches.some((m) => (m.handle as { hideSidebar?: boolean } | null)?.hideSidebar);

  return (
    <AppShell showSidebar={!hideSidebar}>
      <PageTransition>
        <Outlet />
      </PageTransition>
    </AppShell>
  );
}
