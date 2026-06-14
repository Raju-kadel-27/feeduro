import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { ActivityOverTime, DateRange } from "../schemas/analytics";

const chartConfig = {
  count: { label: "New posts", color: "var(--chart-1)" },
} satisfies ChartConfig;

function formatPeriod(period: string, range: DateRange): string {
  const [yearStr, monthStr, dayStr] = period.split("-");
  const d = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
  if (range === "7d") return d.toLocaleDateString("en", { weekday: "short" });
  if (range === "30d") return d.toLocaleDateString("en", { month: "short", day: "numeric" });
  if (range === "90d") return d.toLocaleDateString("en", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en", { month: "short" });
}

interface ActivityChartProps {
  data: ActivityOverTime;
  range: DateRange;
}

export function ActivityChart({ data, range }: ActivityChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">No activity in this period.</p>
    );
  }

  const chartData = data.map((d) => ({ period: formatPeriod(d.period, range), count: d.count }));

  return (
    <div className="h-52 w-full">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <AreaChart
          accessibilityLayer
          data={chartData}
          margin={{ top: 8, left: 12, right: 12, bottom: 12 }}
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
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
          <Area
            dataKey="count"
            type="natural"
            fill="var(--color-count)"
            fillOpacity={0.4}
            stroke="var(--color-count)"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
