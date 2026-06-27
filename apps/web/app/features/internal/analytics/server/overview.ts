import { requireOrgBySlug } from "@features/auth/server/guards";
import { type RouterContextProvider } from "react-router";
import type { DateRange } from "../schemas/analytics";
import { DATE_RANGE_OPTIONS } from "../schemas/analytics";
import { getActivityOverTime } from "./activity-over-time";
import { getAdminActivity } from "./admin-activity";
import { getAnalyticsCache } from "./analytics-cache";
import { getBacklogAging } from "./backlog-aging";
import { getBoardSummaries } from "./board-summary";
import { getBoardVisitorsLast7Days } from "./board-visitors";
import { getRoadmapVisitorsLast7Days } from "./roadmap-visitors";
import { getChangelogEngagement } from "./changelog-engagement";
import { getCommentsAnalytics } from "./comments-analytics";
import { getCompanyEngagement } from "./company-engagement";
import { getCompletedInPeriod } from "./completed-posts";
import { getPeriodDeltas } from "./previous-period";
import { getResolutionTime } from "./resolution-time";
import { getResponseRate } from "./response-rate";
import { getStatusBreakdown } from "./status-breakdown";
import { getSubscriberMetrics } from "./subscriber-metrics";
import { getTagBreakdown } from "./tag-breakdown";
import { getTrendingPosts } from "./trending-posts";
import { getUnrespondedPosts } from "./unresponded-posts";
import { getTopPostsByVotes } from "./vote-trends";
import { getVotesOverTime } from "./votes-over-time";

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
    boards, topPosts, statusBreakdown,
    activityOverTime, votesOverTime, completedPosts, tagBreakdown, trendingPosts,
    changelogEngagement, adminActivity, companyEngagement,
    boardVisitors, roadmapVisitors, commentsAnalytics, unrespondedPosts, deltas,
    resolutionTime, responseRate, backlogAging, subscriberMetrics,
  ] = await Promise.all([
    getBoardSummaries(organizationId, since),
    getTopPostsByVotes(organizationId, boardId, 8, since),
    getStatusBreakdown(organizationId, boardId),
    getActivityOverTime(organizationId, range, since, boardId),
    getVotesOverTime(organizationId, range, since, boardId),
    getCompletedInPeriod(organizationId, since, 10, boardId),
    getTagBreakdown(organizationId, since, 12, boardId),
    getTrendingPosts(organizationId, 8, boardId),
    getChangelogEngagement(organizationId),
    getAdminActivity(organizationId, since, 20, boardId),
    getCompanyEngagement(organizationId, since, 20, boardId),
    getBoardVisitorsLast7Days(organizationId, boardId),
    getRoadmapVisitorsLast7Days(organizationId),
    getCommentsAnalytics(organizationId, since, boardId),
    getUnrespondedPosts(organizationId, boardId),
    since ? getPeriodDeltas(organizationId, since, boardId) : Promise.resolve(null),
    getResolutionTime(organizationId, since, boardId),
    getResponseRate(organizationId, since, boardId),
    getBacklogAging(organizationId, boardId),
    getSubscriberMetrics(organizationId, since),
  ]);

  const relevantBoards = boardId ? boards.filter((b) => b.boardId === boardId) : boards;
  const totalPosts = relevantBoards.reduce((s, b) => s + b.totalPosts, 0);
  const totalVotes = relevantBoards.reduce((s, b) => s + b.totalVotes, 0);
  const totalResolved = relevantBoards.reduce((s, b) => s + b.resolvedPosts, 0);
  const resolutionRate = totalPosts > 0 ? Math.round((totalResolved / totalPosts) * 100) : 0;
  const avgVotesPerPost = totalPosts > 0 ? Math.round((totalVotes / totalPosts) * 10) / 10 : 0;

  return {
    range,
    boardId,
    stats: { totalPosts, totalVotes, resolutionRate, avgVotesPerPost, deltas },
    boards,
    topPosts,
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
    roadmapVisitors,
    commentsAnalytics,
    unrespondedPosts,
    resolutionTime,
    responseRate,
    backlogAging,
    subscriberMetrics,
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
