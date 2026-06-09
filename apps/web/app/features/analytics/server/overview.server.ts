import { type RouterContextProvider } from "react-router";
import { requireOrgBySlug } from "@features/auth/server/guards";
import type { DateRange } from "../schemas/analytics";
import { DATE_RANGE_OPTIONS } from "../schemas/analytics";
import { getAnalyticsCache } from "./analytics-cache.server";
import { getActivityOverTime } from "./activity-over-time.server";
import { getAdminActivity } from "./admin-activity.server";
import { getBoardVisitorsLast7Days } from "./board-visitors.server";
import { getBoardSummaries } from "./board-summary.server";
import { getChangelogEngagement } from "./changelog-engagement.server";
import { getCommentsAnalytics } from "./comments-analytics.server";
import { getCompanyEngagement } from "./company-engagement.server";
import { getCompletedInPeriod } from "./completed-posts.server";
import { getPeriodDeltas } from "./previous-period.server";
import { getUnrespondedPosts } from "./unresponded-posts.server";
import { getStatusBreakdown } from "./status-breakdown.server";
import { getStatusFunnel } from "./status-funnel.server";
import { getTagBreakdown } from "./tag-breakdown.server";
import { getTrendingPosts } from "./trending-posts.server";
import { getTopPostsByVotes } from "./vote-trends.server";
import { getResolutionTime } from "./resolution-time.server";
import { getResponseRate } from "./response-rate.server";
import { getBacklogAging } from "./backlog-aging.server";
import { getMergeRate } from "./merge-rate.server";
import { getVoteConversion } from "./vote-conversion.server";
import { getSubscriberMetrics } from "./subscriber-metrics.server";
import { getVotesOverTime } from "./votes-over-time.server";
import { getStatusChangeFeed } from "./status-change-feed.server";

function parseSince(range: string): Date | undefined {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : null;
  if (!days) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function fetchAll(
  organizationId: string,
  range: DateRange,
  since: Date | undefined,
  boardId: string | undefined,
) {
  const nowMs = Date.now();
  const prevSince = since
    ? new Date(since.getTime() - (nowMs - since.getTime()))
    : undefined;

  const [
    boards, topPosts, funnel, statusBreakdown,
    activityOverTime, votesOverTime, completedPosts, tagBreakdown, trendingPosts,
    changelogEngagement, adminActivity, companyEngagement,
    boardVisitors, commentsAnalytics, unrespondedPosts, deltas,
    resolutionTime, responseRate, backlogAging, mergeRate, voteConversion, subscriberMetrics,
    statusChangeFeed,
  ] = await Promise.all([
    getBoardSummaries(organizationId, since),
    getTopPostsByVotes(organizationId, boardId, 8, since),
    getStatusFunnel(organizationId, boardId, since),
    getStatusBreakdown(organizationId, boardId),
    getActivityOverTime(organizationId, range, since, boardId),
    getVotesOverTime(organizationId, range, since, boardId),
    getCompletedInPeriod(organizationId, since, 10, boardId),
    getTagBreakdown(organizationId, since, 12, boardId),
    getTrendingPosts(organizationId, 8, boardId),
    getChangelogEngagement(organizationId),
    getAdminActivity(organizationId, since),
    getCompanyEngagement(organizationId, since),
    getBoardVisitorsLast7Days(organizationId),
    getCommentsAnalytics(organizationId, since),
    getUnrespondedPosts(organizationId),
    since ? getPeriodDeltas(organizationId, since) : Promise.resolve(null),
    getResolutionTime(organizationId, since),
    getResponseRate(organizationId, since),
    getBacklogAging(organizationId),
    getMergeRate(organizationId, since),
    getVoteConversion(organizationId, since),
    getSubscriberMetrics(organizationId, since),
    getStatusChangeFeed(organizationId, since, boardId),
  ]);

  const totalPosts = boards.reduce((s, b) => s + b.totalPosts, 0);
  const totalVotes = boards.reduce((s, b) => s + b.totalVotes, 0);
  const totalResolved = boards.reduce((s, b) => s + b.resolvedPosts, 0);
  const resolutionRate = totalPosts > 0 ? Math.round((totalResolved / totalPosts) * 100) : 0;
  const avgVotesPerPost = totalPosts > 0 ? Math.round((totalVotes / totalPosts) * 10) / 10 : 0;

  return {
    range,
    boardId,
    stats: { totalPosts, totalVotes, resolutionRate, avgVotesPerPost, deltas },
    boards,
    topPosts,
    funnel,
    statusBreakdown,
    activityOverTime,
    votesOverTime,
    completedPosts,
    tagBreakdown,
    trendingPosts,
    changelogEngagement,
    adminActivity,
    companyEngagement,
    boardVisitors,
    commentsAnalytics,
    unrespondedPosts,
    resolutionTime,
    responseRate,
    backlogAging,
    mergeRate,
    voteConversion,
    subscriberMetrics,
    statusChangeFeed,
    fetchedAt: Date.now(),
  };
}

type OverviewData = Awaited<ReturnType<typeof fetchAll>>;

export async function loadAnalyticsOverview(
  request: Request,
  orgSlug: string,
  context?: Readonly<RouterContextProvider>,
) {
  const { session, org } = await requireOrgBySlug(request, orgSlug);
  const organizationId = org.id;

  const url = new URL(request.url);
  const rawRange = url.searchParams.get("range") ?? "all";
  const range = (DATE_RANGE_OPTIONS as readonly string[]).includes(rawRange)
    ? (rawRange as DateRange)
    : "all";
  const since = parseSince(range);

  const boardId = url.searchParams.get("board") ?? undefined;

  const cache = context ? getAnalyticsCache(context) : undefined;
  const cacheKey = `${organizationId}:${range}:${boardId ?? "all"}`;

  const hit = cache?.get<OverviewData>(cacheKey);
  if (hit) return { user: session.user, ...hit };

  const overviewData = await fetchAll(organizationId, range, since, boardId);
  cache?.set(cacheKey, overviewData);
  return { user: session.user, ...overviewData };
}
