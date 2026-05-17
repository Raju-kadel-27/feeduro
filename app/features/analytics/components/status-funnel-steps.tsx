import { cn } from "@lib/utils";
import { ArrowRight } from "lucide-react";
import type { StatusFunnelStep } from "../schemas/analytics";

const STATUS_ORDER = ["open", "reviewing", "planned", "in-progress", "completed"];

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  reviewing: "Reviewing",
  planned: "Planned",
  "in-progress": "In Progress",
  completed: "Completed",
};

const STATUS_COLOR: Record<string, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  reviewing: "bg-yellow-50 text-yellow-700 border-yellow-200",
  planned: "bg-purple-50 text-purple-700 border-purple-200",
  "in-progress": "bg-orange-50 text-orange-700 border-orange-200",
  completed: "bg-green-50 text-green-700 border-green-200",
};

interface StatusFunnelStepsProps {
  steps: StatusFunnelStep[];
}

export function StatusFunnelSteps({ steps }: StatusFunnelStepsProps) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-[#a1a1aa] py-8 text-center">
        No status transitions recorded yet.
      </p>
    );
  }

  const ordered = STATUS_ORDER.reduce<Array<{ from: string; to: string; avgDays: number; count: number }>>(
    (acc, from, i) => {
      const to = STATUS_ORDER[i + 1];
      if (!to) return acc;
      const match = steps.find((s) => s.fromStatus === from && s.toStatus === to);
      if (match) acc.push({ from, to, avgDays: match.avgDays, count: match.transitionCount });
      return acc;
    },
    [],
  );

  const display = ordered.length > 0 ? ordered : steps.slice(0, 5).map((s) => ({
    from: s.fromStatus, to: s.toStatus, avgDays: s.avgDays, count: s.transitionCount,
  }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {display.map((step, i) => (
        <div key={`${step.from}-${step.to}`} className="flex items-center gap-2">
          {i === 0 && (
            <div className={cn("rounded-md border px-3 py-1.5 text-[12px] font-medium", STATUS_COLOR[step.from] ?? "bg-zinc-50 text-zinc-700 border-zinc-200")}>
              {STATUS_LABEL[step.from] ?? step.from}
            </div>
          )}
          <div className="flex flex-col items-center gap-0.5">
            <ArrowRight className="h-3.5 w-3.5 text-[#a1a1aa]" />
            <span className="text-[10px] text-[#a1a1aa] tabular-nums whitespace-nowrap">
              {step.avgDays}d avg · {step.count}
            </span>
          </div>
          <div className={cn("rounded-md border px-3 py-1.5 text-[12px] font-medium", STATUS_COLOR[step.to] ?? "bg-zinc-50 text-zinc-700 border-zinc-200")}>
            {STATUS_LABEL[step.to] ?? step.to}
          </div>
        </div>
      ))}
    </div>
  );
}
