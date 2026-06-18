import type { ResolutionTime, ResponseRate } from "../schemas/health-metrics";
import { StatCard } from "./stat-card";

interface Props {
  resolutionTime: ResolutionTime;
  responseRate: ResponseRate;
}

function fmtDays(d: number | null): string {
  if (d == null) return "—";
  return d < 1 ? `${Math.round(d * 24)}h` : `${d}d`;
}

function fmtHours(h: number | null): string {
  if (h == null) return "—";
  return h < 48 ? `${h}h` : `${Math.round(h / 24)}d`;
}

export function HealthKpiRow({ resolutionTime, responseRate }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <StatCard
        label="Avg Resolution Time"
        value={fmtDays(resolutionTime.avgDays)}
        sub={`median ${fmtDays(resolutionTime.medianDays)} · ${resolutionTime.resolvedCount} resolved`}
      />
      <StatCard
        label="Team Response Rate"
        value={responseRate.responseRate != null ? `${responseRate.responseRate}%` : "—"}
        sub={`avg first response ${fmtHours(responseRate.avgFirstResponseHours)}`}
      />
    </div>
  );
}
