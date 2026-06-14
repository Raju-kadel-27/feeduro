import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@components/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import type { BacklogAging } from "../schemas/health-metrics";

const BUCKETS: Array<{
  key: keyof Omit<BacklogAging, "total">;
  label: string;
  colorKey: string;
}> = [
  { key: "bucket0to7",   label: "0–7 days",   colorKey: "fresh"    },
  { key: "bucket8to30",  label: "8–30 days",  colorKey: "moderate" },
  { key: "bucket31to90", label: "31–90 days", colorKey: "aging"    },
  { key: "bucket90plus", label: "90+ days",   colorKey: "stale"    },
];

const chartConfig: ChartConfig = {
  posts:    { label: "Posts"      },
  fresh:    { label: "0–7 days",   color: "#10b981" },
  moderate: { label: "8–30 days",  color: "#facc15" },
  aging:    { label: "31–90 days", color: "#f97316" },
  stale:    { label: "90+ days",   color: "#f43f5e" },
};

export function BacklogAgingChart({ aging }: { aging: BacklogAging }) {
  if (aging.total === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No open posts in the backlog.
      </p>
    );
  }

  const chartData = BUCKETS.map(({ key, label, colorKey }) => ({
    label,
    posts: aging[key],
    pct: aging.total > 0 ? ((aging[key] / aging.total) * 100).toFixed(1) : "0.0",
    fill: `var(--color-${colorKey})`,
  }));

  return (
    <>
      <ChartContainer config={chartConfig} className="h-72 w-full">
        <BarChart
          accessibilityLayer
          data={chartData}
          margin={{ top: 32, left: 12, right: 12, bottom: 12 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tick={{ fontSize: 12 }}
          />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} width={28} />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={(value, _name, item) => [
                  `${value} posts (${item.payload.pct}%)`,
                  item.payload.label,
                ]}
                hideLabel
              />
            }
          />
          <Bar dataKey="posts" radius={6} maxBarSize={56}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
            <LabelList position="top" offset={8} className="fill-foreground" fontSize={12} />
          </Bar>
        </BarChart>
      </ChartContainer>
      <p className="text-xs text-muted-foreground pt-1">{aging.total} open posts total</p>
    </>
  );
}
