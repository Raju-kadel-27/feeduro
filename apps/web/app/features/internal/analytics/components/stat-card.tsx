import { cn } from "@lib/utils";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  /** undefined = no comparison supported; null = supported but no range selected; number = % change */
  delta?: number | null;
  /** Human-readable tooltip for the comparison window, e.g. "Dec 2 – Dec 31" */
  deltaTooltip?: string;
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

export function StatCard({ label, value, sub, delta, deltaTooltip, sparkline }: StatCardProps) {
  const supportsDelta = delta !== undefined;
  const hasDelta = supportsDelta && delta !== null;
  const positive = hasDelta && delta > 0;
  const neutral = hasDelta && delta === 0;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-1 hover:shadow-sm transition-shadow">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>

      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
        {sparkline && <Sparkline data={sparkline} />}
      </div>

      {sub && (
        <p className="text-xs text-muted-foreground/70 truncate" title={sub}>
          {sub}
        </p>
      )}

      {supportsDelta && (
        <div className="flex items-center gap-1 pt-1">
          {hasDelta ? (
            <>
              {positive ? (
                <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              ) : neutral ? (
                <Minus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 shrink-0 text-rose-500" />
              )}
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  positive ? "text-emerald-500" : neutral ? "text-muted-foreground" : "text-rose-500",
                )}
              >
                {positive ? `+${delta}%` : neutral ? "0%" : `${delta}%`}
              </span>
              <span
                className="text-xs text-muted-foreground/60 cursor-help"
                title={deltaTooltip}
              >
                vs prev. period
              </span>
            </>
          ) : (
            <>
              <Minus className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
              <span className="text-xs text-muted-foreground/40">select a range to compare</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
