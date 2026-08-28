import { PageTransition } from "@components/page-transition";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import { AppShell } from "@features/internal/layout/components/app-shell";
import { useTawk } from "@hooks/use-tawk";
import { getAuth } from "@lib/auth/server";
import { toDisplayName } from "@utils/display-name";
import { useEffect } from "react";
import { data, Outlet, useLoaderData, useMatches } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/_layout";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId, session } = await requireOrgBySlug(db, request, params.orgSlug);

  // Sync activeOrganizationId when the user navigates to a different org's URL.
  // Without this, API actions (which use requireOrganization → activeOrganizationId)
  // would operate on the wrong org, causing spurious 403s for integration endpoints.
  const activeOrgId = (session.session as { activeOrganizationId?: string }).activeOrganizationId;
  let syncHeaders = new Headers();
  if (activeOrgId !== organizationId) {
    const syncResponse = await getAuth(db).api.setActiveOrganization({
      body: { organizationId },
      headers: request.headers,
      asResponse: true,
    });
    syncHeaders = syncResponse.headers;
  }

  const planLimits = await getOrgPlanLimits(db, organizationId);
  const email = session.user.email ?? "";
  return data(
    {
      planLimits,
      // Passed to tawk.to so support agents see who they're talking to without asking.
      // requireOrgBySlug already resolved the session — no extra DB roundtrip.
      tawkViewer: {
        // Prefer the stored display name; fall back to a human-readable derivation
        // from the email local-part so the dashboard never shows raw email addresses.
        name: session.user.name || toDisplayName(email),
        email,
      },
    },
    { headers: syncHeaders },
  );
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
  const { tawkViewer } = useLoaderData<typeof loader>();
  const { identify } = useTawk();
  const matches = useMatches();
  const hideSidebar = matches.some((m) => (m.handle as { hideSidebar?: boolean } | null)?.hideSidebar);

  useEffect(() => {
    if (tawkViewer.email) identify(tawkViewer);
  }, [tawkViewer.email, identify]);

  return (
    <AppShell showSidebar={!hideSidebar}>
      <PageTransition>
        <Outlet />
      </PageTransition>
    </AppShell>
  );
}
