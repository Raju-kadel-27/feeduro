import { SidebarTrigger } from "@components/ui/sidebar";
import {
  getAffiliateStats,
  joinAffiliateProgram,
  requestPayout,
} from "@features/internal/affiliate/server/service";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { AffiliateDashboard } from "@features/internal/affiliate/components/affiliate-dashboard";
import { getBaseUrl } from "@utils/base-url";
import { data } from "react-router";
import type { Route } from "./+types/affiliate";

export function meta() {
  return [{ title: "Affiliate Program — Feeduro" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session } = await requireOrgBySlug(request, params.orgSlug);
  const stats = await getAffiliateStats(session.user.id);
  const baseUrl = getBaseUrl();
  return data({ stats, baseUrl });
}

export async function action({ request, params }: Route.ActionArgs) {
  const { session } = await requireOrgBySlug(request, params.orgSlug);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "join") {
    const result = await joinAffiliateProgram(session.user.id);
    return data({ joined: true, code: result.code });
  }

  if (intent === "payout") {
    const payoutDetails = String(formData.get("payoutDetails") ?? "").trim();
    if (!payoutDetails) return data({ error: "Enter your payment details" }, { status: 400 });
    const result = await requestPayout(session.user.id, payoutDetails);
    if (result.error) return data({ error: result.error }, { status: 400 });
    return data({ payoutRequested: true });
  }

  return data({ error: "Unknown action" }, { status: 400 });
}

export default function AffiliateRoute({ loaderData }: Route.ComponentProps) {
  return (
        <>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">Affiliate Program</span>
        </header>
        <main className="p-6 max-w-2xl mx-auto w-full">
          <AffiliateDashboard stats={loaderData.stats} baseUrl={loaderData.baseUrl} />
        </main>
        </>
  );
}
