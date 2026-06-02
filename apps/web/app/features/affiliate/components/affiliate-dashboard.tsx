import type { AffiliateStats } from "@features/affiliate/server/service";
import { formatCents } from "@features/affiliate/server/utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { AffiliateHistory } from "./affiliate-history";
import { AffiliateJoinCard } from "./affiliate-join-card";

type FetcherData = { payoutRequested?: boolean; error?: string };

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
        {label}
      </p>
    </div>
  );
}

export function AffiliateDashboard({
  stats,
  baseUrl,
}: {
  stats: AffiliateStats | null;
  baseUrl: string;
}) {
  const fetcher = useFetcher<FetcherData>();
  const [copied, setCopied] = useState(false);
  const [payoutDetails, setPayoutDetails] = useState(stats?.payoutEmail ?? "");
  const referralUrl = stats ? `${baseUrl}/r/${stats.code}` : null;
  const fd = fetcher.data;

  function copy() {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!stats) return <AffiliateJoinCard />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Affiliate Program</h2>
        <p className="text-sm text-muted-foreground mt-1">
          You earn {stats.commissionPercent}% on every subscription
          for {stats.commissionDurationMonths} months.
        </p>
      </div>

      <div className="grid grid-cols-4 divide-x rounded-xl border overflow-hidden">
        <StatCell value={stats.totalClicks.toLocaleString()} label="Clicks" />
        <StatCell value={stats.totalConversions.toLocaleString()} label="Conversions" />
        <StatCell value={formatCents(stats.totalEarningsCents)} label="All-time earned" />
        <StatCell value={formatCents(stats.pendingPayoutCents)} label="Pending payout" />
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Referral link
        </p>
        <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
          <code className="flex-1 px-3 py-1.5 text-sm font-mono text-foreground/80 truncate">
            {referralUrl}
          </code>
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 transition-colors shrink-0"
          >
            {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Request payout
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Minimum $10.00 · Processed within 5 business days.
        </p>
        {fd?.payoutRequested ? (
          <p className="text-sm font-medium text-emerald-600">
            ✓ Payout requested — we'll process it within 5 business days.
          </p>
        ) : (
          <fetcher.Form method="post" className="flex gap-2">
            <input type="hidden" name="intent" value="payout" />
            <input
              name="payoutDetails"
              type="text"
              placeholder="PayPal email, Wise, bank details…"
              value={payoutDetails}
              onChange={(e) => setPayoutDetails(e.target.value)}
              className="flex-1 max-w-xs h-9 rounded-lg border bg-background px-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={fetcher.state !== "idle" || stats.pendingPayoutCents < 1000}
              className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 disabled:opacity-50 transition-colors"
            >
              {fetcher.state !== "idle" ? "Requesting…" : "Request payout"}
            </button>
          </fetcher.Form>
        )}
        {fd?.error && <p className="text-xs text-destructive mt-2">{fd.error}</p>}
      </div>

      <AffiliateHistory
        conversions={stats.recentConversions}
        payouts={stats.recentPayouts}
      />
    </div>
  );
}
