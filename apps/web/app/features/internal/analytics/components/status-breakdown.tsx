import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@components/ui/chart";
import { Pie, PieChart } from "recharts";
import type { StatusBreakdown } from "../schemas/analytics";

const STATUS_ORDER = ["open", "reviewing", "planned", "in-progress", "completed", "closed"];

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  reviewing: "Under Review",
  planned: "Planned",
  "in-progress": "In Progress",
  completed: "Completed",
  closed: "Closed",
};

const chartConfig = {
  count: { label: "Posts" },
  open: { label: "Open", color: "hsl(217 91% 60%)" },
  reviewing: { label: "Under Review", color: "hsl(43 96% 56%)" },
  planned: { label: "Planned", color: "hsl(271 81% 56%)" },
  "in-progress": { label: "In Progress", color: "hsl(25 95% 53%)" },
  completed: { label: "Completed", color: "hsl(142 76% 36%)" },
  closed: { label: "Closed", color: "hsl(215 14% 55%)" },
} satisfies ChartConfig;

interface StatusBreakdownProps {
  breakdown: StatusBreakdown;
}

export function StatusBreakdownBar({ breakdown }: StatusBreakdownProps) {
  const total = breakdown.reduce((s, b) => s + b.count, 0);
  if (total === 0) {
    return <p className="text-sm text-muted-foreground py-2 text-center">No posts yet.</p>;
  }

  const sorted = [...breakdown].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  );

  const chartData = sorted.map(({ status, count }) => ({
    status,
    count,
    pct: Math.round((count / total) * 100),
    fill: `var(--color-${status})`,
  }));

  return (
    <div className="flex items-center gap-8">
      <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[160px] shrink-0">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="status"
            innerRadius={42}
            outerRadius={70}
            paddingAngle={2}
            strokeWidth={0}
          />
        </PieChart>
      </ChartContainer>

      <div className="flex-1 space-y-2 min-w-0">
        {chartData.map(({ status, count, pct }) => {
          const color = (chartConfig as Record<string, { color?: string }>)[status]?.color ?? "#ccc";
          return (
            <div key={status} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
              <span className="flex-1 text-muted-foreground truncate">{STATUS_LABEL[status] ?? status}</span>
              <span className="tabular-nums font-medium w-6 text-right">{count}</span>
              <span className="tabular-nums text-muted-foreground w-9 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
