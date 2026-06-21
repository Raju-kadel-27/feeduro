import { cn } from "@lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  delta?: number | null;
  sparkline?: number[];
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 56;
  const h = 20;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="text-primary/50 shrink-0"
      aria-hidden="true"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatCard({ label, value, sub, delta, sparkline }: StatCardProps) {
  const hasDelta = delta != null;
  const positive = hasDelta && delta >= 0;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-1 hover:shadow-sm transition-shadow">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
        {sparkline && <Sparkline data={sparkline} />}
      </div>
      <div className="flex items-center gap-2">
        {sub && (
          <p className="text-xs text-muted-foreground/70 truncate" title={sub}>
            {sub}
          </p>
        )}
        {hasDelta && (
          <span
            className={cn(
              "text-xs font-medium tabular-nums shrink-0",
              positive ? "text-emerald-500" : "text-rose-500",
            )}
            aria-label={`${positive ? "increased" : "decreased"} by ${Math.abs(delta)}%`}
          >
            {positive ? "↑" : "↓"} {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  );
}
