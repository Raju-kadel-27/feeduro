import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@components/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import type { TagBreakdown } from "../schemas/analytics";

interface TagBreakdownChartProps {
  tags: TagBreakdown;
}

export function TagBreakdownChart({ tags }: TagBreakdownChartProps) {
  if (tags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">No tags applied to posts yet.</p>
    );
  }

  const chartConfig: ChartConfig = {
    posts: { label: "Posts" },
    ...Object.fromEntries(tags.map((t, i) => [`tag${i}`, { label: t.tagName, color: t.tagColor }])),
  };

  const chartData = tags.map((t, i) => ({
    name: t.tagName.length > 12 ? `${t.tagName.slice(0, 12)}…` : t.tagName,
    posts: t.postCount,
    votes: t.totalVotes,
    fill: `var(--color-tag${i})`,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-72 w-full">
      <BarChart
        accessibilityLayer
        data={chartData}
        margin={{ top: 32, left: 12, right: 12, bottom: 12 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
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
                `${value} posts · ${item.payload.votes} votes`,
                item.payload.name,
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
  );
}
