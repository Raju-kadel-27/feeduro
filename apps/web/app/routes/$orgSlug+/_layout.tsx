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

export default function OrgLayout() {
  const matches = useMatches();
  const leaf = matches[matches.length - 1];

  if (leaf?.id === "routes/$orgSlug+/_index") {
    return <Outlet />;
  }

  return (
    <AppShell>
      <PageTransition>
        <Outlet />
      </PageTransition>
    </AppShell>
  );
}
