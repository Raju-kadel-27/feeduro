import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@components/ui/chart";
import type { ActivityOverTime, DateRange, VotesOverTime } from "../schemas/analytics";

const chartConfig = {
  posts: { label: "New posts", color: "var(--chart-1)" },
  votes: { label: "Votes cast", color: "var(--chart-2)" },
} satisfies ChartConfig;

type ActiveKey = "posts" | "votes";

function formatPeriod(period: string, range: DateRange): string {
  const [yearStr, monthStr, dayStr] = period.split("-");
  const d = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
  if (range === "7d") return d.toLocaleDateString("en", { weekday: "short" });
  if (range === "30d") return d.toLocaleDateString("en", { month: "short", day: "numeric" });
  if (range === "90d") return d.toLocaleDateString("en", { month: "short", day: "numeric" });
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

  const series = active === "votes" ? votesData : postsData;

  const chartData = series.map((d) => ({
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

      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No activity in this period.</p>
      ) : (
        <div className="px-2 pt-4 pb-2">
          <ChartContainer config={chartConfig} className="h-52 w-full">
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 8, left: 12, right: 12, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
                width={36}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="count" />} />
              <Bar
                dataKey="count"
                name={chartConfig[active].label}
                fill={`var(--color-${active})`}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </div>
  );
}
