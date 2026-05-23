import { Skeleton } from "@components/ui/skeleton";
import type { loadAnalyticsOverview } from "../server/overview.server";
import { ActivityChart } from "./activity-chart";
import { AnalyticsReports } from "./analytics-reports";
import { BoardHealthList } from "./board-health-list";
import { CacheFreshnessBanner } from "./cache-freshness-banner";
import { CompletedPostsList } from "./completed-posts-list";
import { DateRangePicker } from "./date-range-picker";
import { StatCard } from "./stat-card";
import { StatusBreakdownBar } from "./status-breakdown";
import { StatusFunnelSteps } from "./status-funnel-steps";
import { TagBreakdownChart } from "./tag-breakdown-chart";
import { TopPostsChart } from "./top-posts-chart";
import { TrendingPostsList } from "./trending-posts-list";

type OverviewData = Awaited<ReturnType<typeof loadAnalyticsOverview>>;

const RANGE_LABEL: Record<string, string | undefined> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  all: undefined,
};

const ACTIVITY_SUB: Record<string, string> = {
  "7d": "daily — last 7 days",
  "30d": "daily — last 30 days",
  "90d": "weekly — last 90 days",
  all: "monthly — last 12 months",
};

export function AnalyticsOverview({ data }: { data: OverviewData }) {
  const {
    stats, boards, topPosts, funnel, statusBreakdown, activityOverTime,
    completedPosts, tagBreakdown, trendingPosts, range,
    changelogEngagement, adminActivity, companyEngagement, fetchedAt,
  } = data;
  const rangeLabel = RANGE_LABEL[range];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <DateRangePicker />
        {rangeLabel && (
          <span className="text-xs text-muted-foreground">Showing data for {rangeLabel}</span>
        )}
      </div>

      <CacheFreshnessBanner fetchedAt={fetchedAt} />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Posts" value={stats.totalPosts} sub={rangeLabel} />
        <StatCard label="Total Votes" value={stats.totalVotes} sub={rangeLabel} />
        <StatCard label="Resolution Rate" value={`${stats.resolutionRate}%`} sub="posts marked completed" />
        <StatCard label="Avg Votes / Post" value={stats.avgVotesPerPost} sub="across all boards" />
      </div>

      {/* Status funnel — full width, above activity */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Status Funnel</h2>
          <p className="text-xs text-muted-foreground">avg days between transitions</p>
        </div>
        <StatusFunnelSteps steps={funnel} />
      </div>

      {/* Volume trend — full width */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">New Posts Over Time</h2>
          <p className="text-xs text-muted-foreground">{ACTIVITY_SUB[range]}</p>
        </div>
        <ActivityChart data={activityOverTime} range={range} />
      </div>

      {/* Top features — full width so titles + bars have room */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Top Requested Features</h2>
        <TopPostsChart posts={topPosts} />
      </div>

      {/* Status distribution + Trending */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Status Breakdown</h2>
            <p className="text-xs text-muted-foreground">current state</p>
          </div>
          <StatusBreakdownBar breakdown={statusBreakdown} />
        </div>
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Trending This Week</h2>
            <p className="text-xs text-muted-foreground">new votes · vs last week</p>
          </div>
          <TrendingPostsList posts={trendingPosts} />
        </div>
      </div>

      {/* Top tags — full width */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Top Tags</h2>
          <p className="text-xs text-muted-foreground">by post count</p>
        </div>
        <TagBreakdownChart tags={tagBreakdown} />
      </div>

      {/* Board health + Completed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold">Board Health</h2>
          <BoardHealthList boards={boards} />
        </div>
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">
              {rangeLabel ? `Completed in ${rangeLabel}` : "Recently Completed"}
            </h2>
            <p className="text-xs text-muted-foreground">{completedPosts.length} posts</p>
          </div>
          <CompletedPostsList posts={completedPosts} rangeLabel={rangeLabel} />
        </div>
      </div>

      <AnalyticsReports data={{ changelogEngagement, adminActivity, companyEngagement, range }} />
    </div>
  );
}

export function AnalyticsOverviewSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-9 w-72 rounded-lg" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-60 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="lg:col-span-2 h-48 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="lg:col-span-2 h-36 rounded-xl" />
      </div>
    </div>
  );
}
