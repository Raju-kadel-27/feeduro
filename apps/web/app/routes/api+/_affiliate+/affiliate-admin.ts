import {
  adminApproveConversion,
  adminClawbackConversion,
  adminClawbackPayout,
  adminListAffiliates,
  adminListFlaggedConversions,
  adminListPayouts,
  adminMarkPayoutPaid,
  adminRejectConversion,
  adminSetAffiliateStatus,
} from "@features/internal/affiliate/server/service";
import { requireSession } from "@lib/session";
import { getEnv } from "@utils/get-env";
import { data } from "react-router";

import type { Route } from "./+types/affiliate-admin";

function isAdminEmail(email: string): boolean {
  const raw = getEnv().AFFILIATE_ADMIN_EMAILS ?? "";
  if (!raw) return false;
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

async function requireAdmin(request: Request) {
  const session = await requireSession(request);
  if (!isAdminEmail(session.user.email)) {
    throw new Response("Forbidden", { status: 403 });
  }
  return session;
}

// GET /api/affiliate-admin?view=affiliates|flagged|payouts
export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);

  const url = new URL(request.url);
  const view = url.searchParams.get("view") ?? "affiliates";

  if (view === "flagged") {
    return data({ view, conversions: await adminListFlaggedConversions() });
  }
  if (view === "payouts") {
    return data({ view, payouts: await adminListPayouts() });
  }
  return data({ view, affiliates: await adminListAffiliates() });
}

// POST /api/affiliate-admin
// Body: { action: "approve"|"reject"|"clawback"|"set_status"|"mark_paid", ... }
export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdmin(request);
  const body = (await request.json()) as Record<string, string>;
  const { action: act } = body;

  if (act === "approve") {
    return data(await adminApproveConversion(body.conversionId!, session.user.id));
  }
  if (act === "reject") {
    return data(await adminRejectConversion(body.conversionId!, session.user.id));
  }
  if (act === "clawback_conversion") {
    return data(await adminClawbackConversion(body.conversionId!, session.user.id));
  }
  if (act === "clawback") {
    return data(await adminClawbackPayout(body.payoutId!, session.user.id));
  }
  if (act === "set_status") {
    const status = body.status as "active" | "suspended";
    return data(await adminSetAffiliateStatus(body.affiliateId!, status));
  }
  if (act === "mark_paid") {
    return data(await adminMarkPayoutPaid(body.payoutId!));
  }

  return new Response("Unknown action", { status: 400 });
}
