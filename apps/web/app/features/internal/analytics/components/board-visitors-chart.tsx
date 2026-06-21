import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@components/ui/chart";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import type { BoardVisitorPoint } from "../schemas/analytics";

const chartConfig = {
  uniqueVisitors: { label: "Unique visitors", color: "hsl(217 91% 60%)" },
  totalViews: { label: "Total views", color: "hsl(217 91% 45%)" },
} satisfies ChartConfig;

type ActiveKey = "uniqueVisitors" | "totalViews";

interface Props {
  chart: BoardVisitorPoint[];
  totalViews: number;
  uniqueVisitors: number;
}

export function BoardVisitorsChart({ chart, totalViews, uniqueVisitors }: Props) {
  const [active, setActive] = useState<ActiveKey>("uniqueVisitors");

  const totals = { uniqueVisitors, totalViews } as const;

  const chartData = chart.map((d) => {
    const [y, m, day] = d.period.split("-");
    const date = new Date(Number(y), Number(m) - 1, Number(day));
    return {
      period: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      rawPeriod: d.period,
      uniqueVisitors: d.uniqueVisitors,
      totalViews: d.totalViews,
    };
  });

  if (chart.every((d) => d.uniqueVisitors === 0)) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No visitor data yet — tracking starts as soon as the board receives its first visit.
      </p>
    );
  }

  return (
    <div>
      {/* Interactive header — click to switch active series */}
      <div className="flex border-b">
        {(["uniqueVisitors", "totalViews"] as ActiveKey[]).map((key) => (
          <button
            key={key}
            type="button"
            data-active={active === key}
            onClick={() => setActive(key)}
            className="flex flex-1 flex-col gap-1 px-5 py-3 text-left border-r last:border-r-0 data-[active=true]:bg-muted/40 hover:bg-muted/20 transition-colors"
          >
            <span className="text-xs text-muted-foreground">
              {chartConfig[key].label}
            </span>
            <span className="text-2xl font-semibold tabular-nums">
              {totals[key].toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">last 7 days</span>
          </button>
        ))}
      </div>

      <div className="px-2 pt-4 pb-4">
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 10, left: 12, right: 12, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[160px]"
                  nameKey={active}
                  labelFormatter={(value) => value}
                />
              }
            />
            <Line
              dataKey={active}
              type="monotone"
              stroke={`var(--color-${active})`}
              strokeWidth={2}
              dot={{ r: 3, fill: `var(--color-${active})` }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}
