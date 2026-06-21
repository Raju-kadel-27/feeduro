import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@components/ui/chart";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import type { ActivityOverTime, DateRange, VotesOverTime } from "../schemas/analytics";

const chartConfig = {
  posts: { label: "New posts", color: "hsl(142 71% 45%)" },
  votes: { label: "Votes cast", color: "hsl(217 91% 60%)" },
} satisfies ChartConfig;

type ActiveKey = "posts" | "votes";

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return monday;
}

// DB GROUP BY only returns rows that exist — fill every expected period with 0
// so the line chart always spans the full range.
function fillGaps(
  data: { period: string; count: number }[],
  range: DateRange,
): { period: string; count: number }[] {
  const dataMap = new Map(data.map((d) => [d.period, d.count]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const periods: string[] = [];

  if (range === "7d") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      periods.push(toDateStr(d));
    }
  } else if (range === "30d") {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      periods.push(toDateStr(d));
    }
  } else if (range === "90d") {
    // Postgres date_trunc('week') truncates to Monday — match that here
    const monday = getMonday(today);
    for (let i = 12; i >= 0; i--) {
      const d = new Date(monday);
      d.setDate(monday.getDate() - i * 7);
      periods.push(toDateStr(d));
    }
  } else {
    // "all" — monthly, last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      periods.push(toDateStr(d));
    }
  }

  return periods.map((period) => ({ period, count: dataMap.get(period) ?? 0 }));
}

function formatPeriod(period: string, range: DateRange): string {
  const [y, m, day] = period.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  if (range === "7d") return d.toLocaleDateString("en", { weekday: "short" });
  if (range === "30d" || range === "90d") return d.toLocaleDateString("en", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en", { month: "short" });
}

interface Props {
  postsData: ActivityOverTime;
  votesData: VotesOverTime;
  totalPosts: number;
  totalVotes: number;
  range: DateRange;
}

export function ActivityCombinedChart({ postsData, votesData, totalPosts, totalVotes, range }: Props) {
  const [active, setActive] = useState<ActiveKey>("votes");

  const rawSeries = active === "votes" ? votesData : postsData;
  const filled = fillGaps(rawSeries, range);

  const chartData = filled.map((d) => ({
    period: formatPeriod(d.period, range),
    count: d.count,
  }));

  const subLabel =
    range === "7d" ? "daily · last 7 days"
    : range === "30d" ? "daily · last 30 days"
    : range === "90d" ? "weekly · last 90 days"
    : "monthly · last 12 months";

  const tiles: { key: ActiveKey; label: string; total: number }[] = [
    { key: "votes", label: "Votes cast", total: totalVotes },
    { key: "posts", label: "New posts", total: totalPosts },
  ];

  return (
    <div>
      <div className="flex border-b">
        {tiles.map(({ key, label, total }) => (
          <button
            key={key}
            type="button"
            data-active={active === key}
            onClick={() => setActive(key)}
            className="flex flex-1 flex-col gap-1 px-5 py-3 text-left border-r last:border-r-0 data-[active=true]:bg-muted/40 hover:bg-muted/20 transition-colors"
          >
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-2xl font-semibold tabular-nums">{total.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">{subLabel}</span>
          </button>
        ))}
      </div>

      <div className="px-2 pt-4 pb-2">
        <ChartContainer config={chartConfig} className="aspect-auto h-52 w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 12, right: 12, top: 20, bottom: 4 }}
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
                  className="w-[140px]"
                  nameKey="count"
                  labelFormatter={(value) => value}
                />
              }
            />
            <Line
              dataKey="count"
              name={chartConfig[active].label}
              type="monotone"
              stroke={`var(--color-${active})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}
