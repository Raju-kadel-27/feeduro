import { Button } from "@components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card";
import { Input } from "@components/ui/input";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import {
  getAffiliateStats,
  joinAffiliateProgram,
  requestPayout,
} from "@features/affiliate/server/service";
import { formatCents } from "@features/affiliate/server/utils";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { AppSidebar } from "@features/layout/components/app-sidebar/app-sidebar";
import { getBaseUrl } from "@utils/base-url";
import { CheckIcon, CopyIcon, GiftIcon, TrendingUpIcon, UsersIcon, WalletIcon } from "lucide-react";
import { useState } from "react";
import { data, useFetcher } from "react-router";

import type { Route } from "./+types/affiliate";

export function meta() {
  return [{ title: "Affiliate Program — Feediyo" }];
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

// ─── Page component ───────────────────────────────────────────────────────────

export default function AffiliatePage({ loaderData }: Route.ComponentProps) {
  const { stats, baseUrl } = loaderData;
  const fetcher = useFetcher();
  const [copied, setCopied] = useState(false);
  const [payoutDetails, setPayoutDetails] = useState(stats?.payoutEmail ?? "");

  const referralUrl = stats ? `${baseUrl}/r/${stats.code}` : null;

  function copyLink() {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-3 border-b shrink-0">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-bold">Affiliate Program</h1>
          </div>

          <div className="p-6 max-w-4xl space-y-6">
            {/* Not enrolled yet */}
            {!stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GiftIcon className="size-5" />
                    Earn by referring teams to Feediyo
                  </CardTitle>
                  <CardDescription>
                    Get a unique referral link. Every team that signs up through your link and
                    subscribes earns you{" "}
                    <strong>20% commission for 12 months</strong>, automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="join" />
                    <Button type="submit" disabled={fetcher.state !== "idle"}>
                      {fetcher.state !== "idle" ? "Joining…" : "Join the affiliate program"}
                    </Button>
                  </fetcher.Form>
                </CardContent>
              </Card>
            )}

            {/* Enrolled */}
            {stats && (
              <>
                {/* Stats row */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <StatCard
                    icon={<UsersIcon className="size-4 text-muted-foreground" />}
                    label="Total clicks"
                    value={stats.totalClicks.toLocaleString()}
                  />
                  <StatCard
                    icon={<TrendingUpIcon className="size-4 text-muted-foreground" />}
                    label="Conversions"
                    value={stats.totalConversions.toLocaleString()}
                  />
                  <StatCard
                    icon={<WalletIcon className="size-4 text-muted-foreground" />}
                    label="Total earned"
                    value={formatCents(stats.totalEarningsCents)}
                  />
                  <StatCard
                    icon={<WalletIcon className="size-4 text-muted-foreground" />}
                    label="Pending payout"
                    value={formatCents(stats.pendingPayoutCents)}
                  />
                </div>

                {/* Referral link */}
                <Card>
                  <CardHeader>
                    <CardTitle>Your referral link</CardTitle>
                    <CardDescription>
                      Share this link. You earn {stats.commissionPercent}% on every subscription
                      for {stats.commissionDurationMonths} months.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Input readOnly value={referralUrl ?? ""} className="font-mono text-sm" />
                    <Button variant="outline" size="icon" onClick={copyLink}>
                      {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                    </Button>
                  </CardContent>
                </Card>

                {/* Payout request */}
                <Card>
                  <CardHeader>
                    <CardTitle>Request payout</CardTitle>
                    <CardDescription>
                      Minimum payout is $10.00. Processed within 5 business days.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(fetcher.data as { payoutRequested?: boolean } | undefined)?.payoutRequested ? (
                      <p className="text-sm text-green-600 font-medium">
                        Payout request submitted! We'll process it within 5 business days.
                      </p>
                    ) : (
                      <fetcher.Form method="post" className="flex gap-2">
                        <input type="hidden" name="intent" value="payout" />
                        <Input
                          name="payoutDetails"
                          type="text"
                          placeholder="PayPal email, bank details, Wise…"
                          value={payoutDetails}
                          onChange={(e) => setPayoutDetails(e.target.value)}
                          className="max-w-xs"
                        />
                        <Button
                          type="submit"
                          disabled={fetcher.state !== "idle" || stats.pendingPayoutCents < 1000}
                        >
                          {fetcher.state !== "idle" ? "Requesting…" : "Request payout"}
                        </Button>
                      </fetcher.Form>
                    )}
                    {(fetcher.data as { error?: string } | undefined)?.error && (
                      <p className="text-sm text-destructive mt-2">
                        {(fetcher.data as { error: string }).error}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Recent conversions */}
                {stats.recentConversions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent conversions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="divide-y text-sm">
                        {stats.recentConversions.map((c) => (
                          <div key={c.id} className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                              <span className="capitalize font-medium">{c.type}</span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  c.status === "paid"
                                    ? "bg-green-100 text-green-700"
                                    : c.status === "approved"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {c.status}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-green-600">
                                +{formatCents(c.commissionCents)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(c.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Payout history */}
                {stats.recentPayouts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Payout history</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="divide-y text-sm">
                        {stats.recentPayouts.map((p) => (
                          <div key={p.id} className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{formatCents(p.amountCents)}</span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  p.status === "paid"
                                    ? "bg-green-100 text-green-700"
                                    : p.status === "processing"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {p.status}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {p.paidAt
                                ? `Paid ${new Date(p.paidAt).toLocaleDateString()}`
                                : new Date(p.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
