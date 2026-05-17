import { requireOrgBySlug } from "@features/auth/server/guards";
import { getBoardSummaries } from "./board-summary.server";
import { getStatusFunnel } from "./status-funnel.server";
import { getTopPostsByVotes } from "./vote-trends.server";

export async function loadAnalyticsOverview(request: Request, orgSlug: string) {
  const { session, org } = await requireOrgBySlug(request, orgSlug);
  const organizationId = org.id;

  const [boards, topPosts, funnel] = await Promise.all([
    getBoardSummaries(organizationId),
    getTopPostsByVotes(organizationId, undefined, 8),
    getStatusFunnel(organizationId),
  ]);

  const totalPosts = boards.reduce((s, b) => s + b.totalPosts, 0);
  const totalVotes = boards.reduce((s, b) => s + b.totalVotes, 0);
  const totalResolved = boards.reduce((s, b) => s + b.resolvedPosts, 0);
  const resolutionRate = totalPosts > 0 ? Math.round((totalResolved / totalPosts) * 100) : 0;
  const avgVotesPerPost = totalPosts > 0 ? Math.round((totalVotes / totalPosts) * 10) / 10 : 0;

  return {
    user: session.user,
    stats: { totalPosts, totalVotes, resolutionRate, avgVotesPerPost },
    boards,
    topPosts,
    funnel,
    fetchedAt: Date.now(),
  };
}
