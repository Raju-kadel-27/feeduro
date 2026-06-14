import { cn } from "@lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  delta?: number | null;
}

export function StatCard({ label, value, sub, delta }: StatCardProps) {
  const hasDelta = delta != null;
  const positive = hasDelta && delta >= 0;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
      <div className="flex items-center gap-2">
        {sub && <p className="text-xs text-muted-foreground/70">{sub}</p>}
        {hasDelta && (
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              positive ? "text-emerald-500" : "text-rose-500",
            )}
          >
            {positive ? "↑" : "↓"} {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  );
}
