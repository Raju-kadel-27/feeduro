import { Skeleton } from "@components/ui/skeleton";
import type { loadAnalyticsOverview } from "../server/overview.server";
import { BoardHealthList } from "./board-health-list";
import { StatCard } from "./stat-card";
import { StatusFunnelSteps } from "./status-funnel-steps";
import { TopPostsChart } from "./top-posts-chart";

type OverviewData = Awaited<ReturnType<typeof loadAnalyticsOverview>>;

interface AnalyticsOverviewProps {
  data: OverviewData;
}

export function AnalyticsOverview({ data }: AnalyticsOverviewProps) {
  const { stats, boards, topPosts, funnel } = data;

  return (
    <div className="space-y-6 p-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Posts" value={stats.totalPosts} />
        <StatCard label="Total Votes" value={stats.totalVotes} />
        <StatCard
          label="Resolution Rate"
          value={`${stats.resolutionRate}%`}
          sub="posts marked completed"
        />
        <StatCard label="Avg Votes / Post" value={stats.avgVotesPerPost} sub="across all boards" />
      </div>

      {/* Top posts + board health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#18181b]">Top Requested Features</h2>
          <TopPostsChart posts={topPosts} />
        </div>

        <div className="rounded-xl border bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#18181b]">Board Health</h2>
          <BoardHealthList boards={boards} />
        </div>
      </div>

      {/* Status funnel */}
      <div className="rounded-xl border bg-white p-5 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-[#18181b]">Status Funnel</h2>
          <p className="text-xs text-[#a1a1aa]">avg days between transitions</p>
        </div>
        <StatusFunnelSteps steps={funnel} />
      </div>
    </div>
  );
}

export function AnalyticsOverviewSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}
