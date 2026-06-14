import {
  adminApproveConversion,
  adminClawbackPayout,
  adminListAffiliates,
  adminListFlaggedConversions,
  adminListPayouts,
  adminMarkPayoutPaid,
  adminRejectConversion,
  adminSetAffiliateStatus,
} from "@features/internal/affiliate/server/service";
import { formatCents } from "@features/internal/affiliate/server/utils";
import { requireSession } from "@lib/session";
import { getEnv } from "@utils/get-env";
import { data, redirect, useFetcher, useLoaderData, useNavigate, useSearchParams } from "react-router";

import type { Route } from "./+types/affiliate-admin";

function isAdminEmail(email: string): boolean {
  const raw = getEnv().AFFILIATE_ADMIN_EMAILS ?? "";
  if (!raw) return false;
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

export function meta() {
  return [{ title: "Affiliate Admin — Feeduro" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireSession(request);
  if (!isAdminEmail(session.user.email)) throw redirect("/");

  const [affiliateList, flaggedList, payoutList] = await Promise.all([
    adminListAffiliates(),
    adminListFlaggedConversions(),
    adminListPayouts(),
  ]);

  return data({ affiliateList, flaggedList, payoutList });
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireSession(request);
  if (!isAdminEmail(session.user.email)) throw redirect("/");

  const form = await request.formData();
  const act = form.get("action") as string;

  if (act === "approve") {
    await adminApproveConversion(form.get("conversionId") as string, session.user.id);
  } else if (act === "reject") {
    await adminRejectConversion(form.get("conversionId") as string, session.user.id);
  } else if (act === "clawback") {
    await adminClawbackPayout(form.get("payoutId") as string, session.user.id);
  } else if (act === "set_status") {
    await adminSetAffiliateStatus(
      form.get("affiliateId") as string,
      form.get("status") as "active" | "suspended",
    );
  } else if (act === "mark_paid") {
    await adminMarkPayoutPaid(form.get("payoutId") as string);
  }

  return data({ ok: true });
}

// ─── Shared components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    suspended: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    flagged: "bg-orange-100 text-orange-800",
    processing: "bg-purple-100 text-purple-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {status}
    </span>
  );
}

type LoaderData = Awaited<ReturnType<typeof loader>>["data"];

// ─── Affiliates tab ───────────────────────────────────────────────────────────

function AffiliatesTab({ affiliateList }: { affiliateList: LoaderData["affiliateList"] }) {
  const fetcher = useFetcher();
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            {["User", "Code", "Status", "Clicks", "Conversions", "Earnings", "Payout email", "Joined", ""].map(
              (h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {affiliateList.map((aff) => (
            <tr key={aff.id} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <div className="font-medium">{aff.user?.name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{aff.user?.email}</div>
              </td>
              <td className="px-4 py-3 font-mono text-xs">{aff.code}</td>
              <td className="px-4 py-3">
                <StatusBadge status={aff.status} />
              </td>
              <td className="px-4 py-3">{aff.totalClicks.toLocaleString()}</td>
              <td className="px-4 py-3">{aff.totalConversions.toLocaleString()}</td>
              <td className="px-4 py-3">{formatCents(aff.totalEarningsCents)}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{aff.payoutEmail ?? "—"}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {new Date(aff.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <fetcher.Form method="post">
                  <input type="hidden" name="action" value="set_status" />
                  <input type="hidden" name="affiliateId" value={aff.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={aff.status === "active" ? "suspended" : "active"}
                  />
                  <button
                    type="submit"
                    className="rounded border px-2 py-1 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    {aff.status === "active" ? "Suspend" : "Reactivate"}
                  </button>
                </fetcher.Form>
              </td>
            </tr>
          ))}
          {affiliateList.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                No affiliates yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Flagged tab ──────────────────────────────────────────────────────────────

function FlaggedTab({ flaggedList }: { flaggedList: LoaderData["flaggedList"] }) {
  const fetcher = useFetcher();
  return (
    <div className="overflow-x-auto">
      {flaggedList.length === 0 ? (
        <p className="px-4 py-8 text-center text-muted-foreground">No flagged conversions.</p>
      ) : (
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Affiliate", "Referred user", "Type", "Commission", "Flag reasons", "Date", "Actions"].map(
                (h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {flaggedList.map((conv) => {
              const reasons: string[] = conv.flagReasons ? (JSON.parse(conv.flagReasons) as string[]) : [];
              return (
                <tr key={conv.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs">{conv.affiliate?.code}</div>
                    <div className="text-xs text-muted-foreground">{conv.affiliate?.user?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {conv.referredUser?.email ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">{conv.type}</td>
                  <td className="px-4 py-3 text-xs font-medium">{formatCents(conv.commissionCents)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {reasons.map((r) => (
                        <span
                          key={r}
                          className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-800"
                        >
                          {r.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(conv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <fetcher.Form method="post">
                        <input type="hidden" name="action" value="approve" />
                        <input type="hidden" name="conversionId" value={conv.id} />
                        <button
                          type="submit"
                          className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                      </fetcher.Form>
                      <fetcher.Form method="post">
                        <input type="hidden" name="action" value="reject" />
                        <input type="hidden" name="conversionId" value={conv.id} />
                        <button
                          type="submit"
                          className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                        >
                          Reject
                        </button>
                      </fetcher.Form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Payouts tab ──────────────────────────────────────────────────────────────

function PayoutsTab({ payoutList }: { payoutList: LoaderData["payoutList"] }) {
  const fetcher = useFetcher();
  return (
    <div>
      <div className="border-b bg-amber-50 px-4 py-2 text-xs text-amber-800">
        <strong>Clawback note:</strong> Marking a payout as paid only updates this system. You must
        also manually issue or reverse the transfer via your payment provider to match.
        Use Clawback only after the external reversal is complete.
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Affiliate", "Amount", "Method / Details", "Status", "Requested", "Paid at", "Actions"].map(
                (h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payoutList.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="font-mono text-xs">{p.affiliate?.code}</div>
                  <div className="text-xs text-muted-foreground">{p.affiliate?.user?.email}</div>
                </td>
                <td className="px-4 py-3 font-medium">{formatCents(p.amountCents)}</td>
                <td className="px-4 py-3 text-xs">
                  <div>{p.paymentMethod}</div>
                  <div className="text-muted-foreground">{p.paymentDetails}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {p.status !== "paid" && (
                      <fetcher.Form method="post">
                        <input type="hidden" name="action" value="mark_paid" />
                        <input type="hidden" name="payoutId" value={p.id} />
                        <button
                          type="submit"
                          className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                        >
                          Mark paid
                        </button>
                      </fetcher.Form>
                    )}
                    {p.status === "paid" && (
                      <fetcher.Form
                        method="post"
                        onSubmit={(e) => {
                          if (!confirm("Clawback this payout? This decrements the affiliate's earnings. Ensure you have already reversed the external payment.")) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="action" value="clawback" />
                        <input type="hidden" name="payoutId" value={p.id} />
                        <button
                          type="submit"
                          className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Clawback
                        </button>
                      </fetcher.Form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {payoutList.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No payout requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TAB_IDS = ["affiliates", "flagged", "payouts"] as const;
type TabId = (typeof TAB_IDS)[number];

export default function AffiliateAdmin() {
  const { affiliateList, flaggedList, payoutList } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const rawTab = searchParams.get("tab") ?? "affiliates";
  const activeTab: TabId = (TAB_IDS as readonly string[]).includes(rawTab)
    ? (rawTab as TabId)
    : "affiliates";

  const flaggedCount = flaggedList.length;

  const tabs: { id: TabId; label: string; alert?: boolean }[] = [
    { id: "affiliates", label: `Affiliates (${affiliateList.length})` },
    { id: "flagged", label: `Flagged (${flaggedCount})`, alert: flaggedCount > 0 },
    { id: "payouts", label: `Payouts (${payoutList.length})` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <h1 className="text-xl font-bold">Affiliate Admin</h1>
          <p className="text-sm text-muted-foreground">Platform-wide affiliate management</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold">{affiliateList.length}</div>
            <div className="text-sm text-muted-foreground">Total affiliates</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold">
              {affiliateList.reduce((s, a) => s + a.totalConversions, 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total conversions</div>
          </div>
          <div
            className={`rounded-lg border bg-card p-4 ${flaggedCount > 0 ? "border-orange-400" : ""}`}
          >
            <div className={`text-2xl font-bold ${flaggedCount > 0 ? "text-orange-600" : ""}`}>
              {flaggedCount}
            </div>
            <div className="text-sm text-muted-foreground">Flagged for review</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold">
              {formatCents(affiliateList.reduce((s, a) => s + a.totalEarningsCents, 0))}
            </div>
            <div className="text-sm text-muted-foreground">Total earnings</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="flex border-b">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => navigate(`?tab=${t.id}`, { replace: true })}
                className={`relative px-5 py-3 text-sm font-medium transition-colors ${
                  activeTab === t.id
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                {t.alert && (
                  <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-orange-500" />
                )}
              </button>
            ))}
          </div>
          {activeTab === "affiliates" && <AffiliatesTab affiliateList={affiliateList} />}
          {activeTab === "flagged" && <FlaggedTab flaggedList={flaggedList} />}
          {activeTab === "payouts" && <PayoutsTab payoutList={payoutList} />}
        </div>
      </div>
    </div>
  );
}
