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
import { StatCard } from "./stat-card";
import { StatusBreakdownBar } from "./status-breakdown";
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
    stats, boards, topPosts, statusBreakdown, activityOverTime, votesOverTime,
    completedPosts, tagBreakdown, trendingPosts, range, boardId,
    changelogEngagement, adminActivity, companyEngagement,
    boardVisitors, commentsAnalytics, unrespondedPosts, fetchedAt,
    resolutionTime, responseRate, backlogAging, subscriberMetrics,
  } = data;

  const { deltas } = stats;
  const rangeLabel = RANGE_LABEL[range];

  const fmtDays = (d: number | null) =>
    d == null ? "—" : d < 1 ? `${Math.round(d * 24)}h` : `${d}d`;
  const fmtHours = (h: number | null) =>
    h == null ? "—" : h < 48 ? `${h}h` : `${Math.round(h / 24)}d`;

  return (
    <div className="space-y-6 p-6">
      <CacheFreshnessBanner fetchedAt={fetchedAt} />

      {/* KPIs — two labeled groups of 3 equal cards */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Volume</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard
            label="Total Posts"
            value={stats.totalPosts}
            sub={rangeLabel}
            delta={deltas?.posts}
            sparkline={activityOverTime.map((p) => p.count)}
          />
          <StatCard
            label="Total Votes"
            value={stats.totalVotes}
            sub={rangeLabel}
            delta={deltas?.votes}
            sparkline={votesOverTime.map((p) => p.count)}
          />
          <StatCard
            label="Resolution Rate"
            value={`${stats.resolutionRate}%`}
            sub="posts marked completed"
            delta={deltas?.resolutionRate}
          />
        </div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1">Team Health</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard
            label="Avg Votes / Post"
            value={stats.avgVotesPerPost}
            sub="across all boards"
            delta={deltas?.avgVotesPerPost}
          />
          <StatCard
            label="Resolution Time"
            value={fmtDays(resolutionTime.avgDays)}
            sub={`median ${fmtDays(resolutionTime.medianDays)} · ${resolutionTime.resolvedCount} resolved`}
          />
          <StatCard
            label="Response Rate"
            value={responseRate.responseRate != null ? `${responseRate.responseRate}%` : "—"}
            sub={`avg first response ${fmtHours(responseRate.avgFirstResponseHours)}`}
          />
        </div>
      </div>

      {/* Board traffic — full width */}
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

      {/* Unresponded posts — amber alert, only renders when there are items */}
      <UnrespondedPostsCard posts={unrespondedPosts} />

      {/* Backlog aging + Board health — side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Backlog Aging</h2>
            <p className="text-xs text-muted-foreground">open posts by age</p>
          </div>
          {backlogAging.bucket31to90 + backlogAging.bucket90plus > 0 && (
            <p className="text-sm font-medium text-amber-500">
              {backlogAging.bucket31to90 + backlogAging.bucket90plus} posts aging &gt; 30 days
            </p>
          )}
          <BacklogAgingChart aging={backlogAging} />
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold">Board Health</h2>
          <BoardHealthList boards={boards} />
        </div>
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

      {/* Top tags + Status breakdown — side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Top Tags</h2>
            <p className="text-xs text-muted-foreground">by post count</p>
          </div>
          <TagBreakdownChart tags={tagBreakdown} />
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Status Breakdown</h2>
            <p className="text-xs text-muted-foreground">current state</p>
          </div>
          <StatusBreakdownBar breakdown={statusBreakdown} />
        </div>
      </div>

      {/* Comments analytics — full width */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Most Discussed Posts</h2>
        <CommentsAnalyticsPanel data={commentsAnalytics} rangeLabel={rangeLabel} />
      </div>

      {/* Trending */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Trending This Week</h2>
          <p className="text-xs text-muted-foreground">new votes · vs last week</p>
        </div>
        <TrendingPostsList posts={trendingPosts} />
      </div>

      {/* Recently completed — full width */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">
            {rangeLabel ? `Completed in ${rangeLabel}` : "Recently Completed"}
          </h2>
          <p className="text-xs text-muted-foreground">{completedPosts.length} posts</p>
        </div>
        <CompletedPostsList posts={completedPosts} rangeLabel={rangeLabel} />
      </div>


<AnalyticsReports data={{ changelogEngagement, topPosts, companyEngagement, range, subscriberMetrics }} />
    </div>
  );
}

export function AnalyticsOverviewSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-9 w-72 rounded-lg" />
      <div className="space-y-3">
        <Skeleton className="h-3 w-16 rounded" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-3 w-20 rounded mt-2" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
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
