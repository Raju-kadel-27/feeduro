import type { SubscriberMetrics } from "../schemas/health-metrics";

export function SubscriberMetricsCard({ metrics, rangeLabel }: {
  metrics: SubscriberMetrics;
  rangeLabel: string | undefined;
}) {
  const churnRate =
    metrics.totalSubscribers > 0
      ? ((metrics.unsubscribed / metrics.totalSubscribers) * 100).toFixed(1)
      : null;

  if (metrics.totalSubscribers === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No changelog subscribers yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-lg bg-muted/50 p-3 space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Active</p>
        <p className="text-xl font-semibold tabular-nums">{metrics.activeSubscribers}</p>
        <p className="text-xs text-muted-foreground/70">of {metrics.totalSubscribers} total</p>
      </div>
      <div className="rounded-lg bg-muted/50 p-3 space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">New</p>
        <p className="text-xl font-semibold tabular-nums text-emerald-500">
          +{metrics.newSubscribers}
        </p>
        <p className="text-xs text-muted-foreground/70">
          {rangeLabel ? `in ${rangeLabel}` : "last 30 days"}
        </p>
      </div>
      <div className="rounded-lg bg-muted/50 p-3 space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Churn</p>
        <p className="text-xl font-semibold tabular-nums text-rose-500">
          {churnRate != null ? `${churnRate}%` : "—"}
        </p>
        <p className="text-xs text-muted-foreground/70">{metrics.unsubscribed} unsubscribed</p>
      </div>
    </div>
  );
}
