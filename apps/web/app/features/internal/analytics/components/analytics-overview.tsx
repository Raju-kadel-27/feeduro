import { Skeleton } from "@components/ui/skeleton";
import type { loadAnalyticsOverview } from "../server/overview.server";
import { ActivityCombinedChart } from "./activity-combined-chart";
import { AdminActivityTable } from "./admin-activity-table";
import { AnalyticsReports } from "./analytics-reports";
import { BacklogAgingChart } from "./backlog-aging-chart";
import { BoardHealthList } from "./board-health-list";
import { BoardVisitorsChart } from "./board-visitors-chart";
import { CacheFreshnessBanner } from "./cache-freshness-banner";
import { CommentsAnalyticsPanel } from "./comments-analytics";
import { CompletedPostsList } from "./completed-posts-list";
import { HealthKpiRow } from "./health-kpi-row";
import { StatCard } from "./stat-card";
import { StatusBreakdownBar } from "./status-breakdown";
import { StatusChangeFeedList } from "./status-change-feed";
import { StatusFunnelSteps } from "./status-funnel-steps";
import { TagBreakdownChart } from "./tag-breakdown-chart";
import { TrendingPostsList } from "./trending-posts-list";
import { UnrespondedPostsCard } from "./unresponded-posts-card";

type OverviewData = Awaited<ReturnType<typeof loadAnalyticsOverview>>;

const RANGE_LABEL: Record<string, string | undefined> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  all: undefined,
};


export function AnalyticsOverview({ data }: { data: OverviewData }) {
  const {
    stats, boards, topPosts, funnel, statusBreakdown, activityOverTime, votesOverTime,
    completedPosts, tagBreakdown, trendingPosts, range, boardId,
    changelogEngagement, adminActivity, companyEngagement,
    boardVisitors, commentsAnalytics, unrespondedPosts, fetchedAt,
    resolutionTime, responseRate, backlogAging, mergeRate, voteConversion, subscriberMetrics,
    statusChangeFeed,
  } = data;

  const { deltas } = stats;
  const rangeLabel = RANGE_LABEL[range];

  return (
    <div className="space-y-6 p-6">
      <CacheFreshnessBanner fetchedAt={fetchedAt} />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Posts"
          value={stats.totalPosts}
          sub={rangeLabel}
          delta={deltas?.posts}
        />
        <StatCard
          label="Total Votes"
          value={stats.totalVotes}
          sub={rangeLabel}
          delta={deltas?.votes}
        />
        <StatCard
          label="Resolution Rate"
          value={`${stats.resolutionRate}%`}
          sub="posts marked completed"
          delta={deltas?.resolutionRate}
        />
        <StatCard
          label="Avg Votes / Post"
          value={stats.avgVotesPerPost}
          sub="across all boards"
          delta={deltas?.avgVotesPerPost}
        />
      </div>

      {/* Health KPIs — resolution time, response rate, merge rate, conversion */}
      <HealthKpiRow
        resolutionTime={resolutionTime}
        responseRate={responseRate}
        mergeRate={mergeRate}
        voteConversion={voteConversion}
      />

      {/* Unresponded posts — amber alert, only renders when there are items */}
      <UnrespondedPostsCard posts={unrespondedPosts} />

      {/* Board traffic — full width, above status funnel */}
      <div className="rounded-xl border bg-card">
        <div className="px-5 pt-5">
          <h2 className="text-sm font-semibold">Board Traffic</h2>
        </div>
        <div className="mt-3">
          <BoardVisitorsChart
            chart={boardVisitors.chart}
            totalViews={boardVisitors.totalViews}
            uniqueVisitors={boardVisitors.uniqueVisitors}
          />
        </div>
      </div>

      {/* Backlog aging — open post age distribution */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Backlog Aging</h2>
          <p className="text-xs text-muted-foreground">open posts by age</p>
        </div>
        <BacklogAgingChart aging={backlogAging} />
      </div>

      {/* Status funnel — full width */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Status Funnel</h2>
          <p className="text-xs text-muted-foreground">avg days between transitions</p>
        </div>
        <StatusFunnelSteps steps={funnel} />
      </div>

      {/* Volume trend — full width */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 pt-5">
          <h2 className="text-sm font-semibold">Activity Over Time</h2>
        </div>
        <div className="mt-3">
          <ActivityCombinedChart
            postsData={activityOverTime}
            votesData={votesOverTime}
            totalPosts={stats.totalPosts}
            totalVotes={stats.totalVotes}
            range={range}
          />
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

      {/* Team activity — full width */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Team Activity</h2>
          <p className="text-xs text-muted-foreground">
            {rangeLabel ? rangeLabel : "all time"} · posts · votes · comments
          </p>
        </div>
        <AdminActivityTable activity={adminActivity} />
      </div>

      {/* Comments analytics — full width, before status breakdown */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Most Discussed Posts</h2>
        <CommentsAnalyticsPanel data={commentsAnalytics} rangeLabel={rangeLabel} />
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

      {/* Board health + Completed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold">Board Health</h2>
          <BoardHealthList boards={boards} />
        </div>
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">
              {rangeLabel ? `Completed in ${rangeLabel}` : "Recently Completed"}
            </h2>
            <p className="text-xs text-muted-foreground">{completedPosts.length} posts</p>
          </div>
          <CompletedPostsList posts={completedPosts} rangeLabel={rangeLabel} />
        </div>
      </div>

      {/* Status change feed */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Status Changes</h2>
          <p className="text-xs text-muted-foreground">
            {boardId
              ? (boards.find((b) => b.boardId === boardId)?.boardName ?? "Selected board")
              : "all boards"} · most recent 25
          </p>
        </div>
        <StatusChangeFeedList feed={statusChangeFeed} />
      </div>

      <AnalyticsReports data={{ changelogEngagement, topPosts, companyEngagement, range, subscriberMetrics }} />
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
