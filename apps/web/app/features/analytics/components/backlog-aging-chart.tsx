import type { BacklogAging } from "../schemas/health-metrics";

const BUCKETS: Array<{
  key: keyof Omit<BacklogAging, "total">;
  label: string;
  barColor: string;
  labelColor: string;
}> = [
  { key: "bucket0to7",   label: "0–7 days",   barColor: "bg-emerald-500", labelColor: "text-emerald-600 dark:text-emerald-400" },
  { key: "bucket8to30",  label: "8–30 days",  barColor: "bg-yellow-400",  labelColor: "text-yellow-600 dark:text-yellow-400" },
  { key: "bucket31to90", label: "31–90 days", barColor: "bg-orange-500",  labelColor: "text-orange-600 dark:text-orange-400" },
  { key: "bucket90plus", label: "90+ days",   barColor: "bg-rose-500",    labelColor: "text-rose-600 dark:text-rose-400" },
];

export function BacklogAgingChart({ aging }: { aging: BacklogAging }) {
  if (aging.total === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No open posts in the backlog.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {BUCKETS.map(({ key, label, barColor, labelColor }) => {
        const count = aging[key];
        const pct = aging.total > 0 ? (count / aging.total) * 100 : 0;
        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{label}</span>
              <span className="tabular-nums font-medium">
                <span className={labelColor}>{count}</span>
                <span className="text-muted-foreground/60 ml-1">({pct.toFixed(1)}%)</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground pt-1">{aging.total} open posts total</p>
    </div>
  );
}
