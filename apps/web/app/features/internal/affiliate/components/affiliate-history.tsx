import type { AffiliateStats } from "@features/internal/affiliate/server/service";
import { formatCents } from "@features/internal/affiliate/server/utils";

const STATUS_CLS: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  approved: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  processing: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
};

function TableShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="px-4 py-2.5 border-b bg-muted/30">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

type Conversion = AffiliateStats["recentConversions"][number];
type Payout = AffiliateStats["recentPayouts"][number];

function ConversionRow({ c }: { c: Conversion }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b last:border-0 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium capitalize">{c.type}</span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_CLS[c.status] ?? "bg-muted text-muted-foreground"}`}
        >
          {c.status}
        </span>
      </div>
      <div className="flex items-center gap-4">
        {c.commissionCents > 0 && (
          <span className="font-semibold text-emerald-600 tabular-nums">
            +{formatCents(c.commissionCents)}
          </span>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">
          {new Date(c.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

function PayoutRow({ p }: { p: Payout }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b last:border-0 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-semibold tabular-nums">{formatCents(p.amountCents)}</span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_CLS[p.status] ?? "bg-muted text-muted-foreground"}`}
        >
          {p.status}
        </span>
      </div>
      <span className="text-xs text-muted-foreground">
        {p.paidAt
          ? `Paid ${new Date(p.paidAt).toLocaleDateString()}`
          : new Date(p.createdAt).toLocaleDateString()}
      </span>
    </div>
  );
}

export function AffiliateHistory({
  conversions,
  payouts,
}: {
  conversions: Conversion[];
  payouts: Payout[];
}) {
  return (
    <>
      {conversions.length > 0 && (
        <TableShell title="Conversions">
          {conversions.map((c) => <ConversionRow key={c.id} c={c} />)}
        </TableShell>
      )}
      {payouts.length > 0 && (
        <TableShell title="Payout history">
          {payouts.map((p) => <PayoutRow key={p.id} p={p} />)}
        </TableShell>
      )}
    </>
  );
}
