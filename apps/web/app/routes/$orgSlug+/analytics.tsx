import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@components/ui/sidebar";
import { AnalyticsOverview } from "@features/analytics/components/analytics-overview";
import { loadAnalyticsOverview } from "@features/analytics/server/overview.server";
import { AppSidebar } from "@features/layout/components/app-sidebar/app-sidebar";

import type { Route } from "./+types/analytics";

export function meta() {
  return [{ title: "Analytics – Feediyo" }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  return loadAnalyticsOverview(request, params.orgSlug, context);
}

// TODO: REMOVE MOCK DATA — for visual testing only
const USE_MOCK = true;
const MOCK_OVERRIDE = {
  stats: {
    totalPosts: 142,
    totalVotes: 893,
    resolutionRate: 34,
    avgVotesPerPost: 6.3,
  },
  topPosts: [
    {
      id: "1",
      title: "Dark mode support across all views",
      status: "planned",
      voteCount: 187,
      uniqueCompanies: 14,
    },
    {
      id: "2",
      title: "Bulk export to CSV and Excel",
      status: "in-progress",
      voteCount: 143,
      uniqueCompanies: 11,
    },
    {
      id: "3",
      title: "Custom webhook integrations",
      status: "open",
      voteCount: 121,
      uniqueCompanies: 9,
    },
    {
      id: "4",
      title: "Two-factor authentication",
      status: "completed",
      voteCount: 98,
      uniqueCompanies: 8,
    },
    {
      id: "5",
      title: "Mobile app for iOS and Android",
      status: "reviewing",
      voteCount: 76,
      uniqueCompanies: 7,
    },
    {
      id: "6",
      title: "Advanced filtering and saved views",
      status: "in-progress",
      voteCount: 54,
      uniqueCompanies: 5,
    },
    {
      id: "7",
      title: "Zapier and Make integration",
      status: "open",
      voteCount: 43,
      uniqueCompanies: 6,
    },
    {
      id: "8",
      title: "Comment threading and reactions",
      status: "closed",
      voteCount: 31,
      uniqueCompanies: 3,
    },
  ],
  trendingPosts: [
    {
      id: "1",
      title: "Dark mode support across all views",
      status: "planned",
      totalVotes: 187,
      votesThisWeek: 24,
      votesLastWeek: 11,
    },
    {
      id: "3",
      title: "Custom webhook integrations",
      status: "open",
      totalVotes: 121,
      votesThisWeek: 19,
      votesLastWeek: 22,
    },
    {
      id: "2",
      title: "Bulk export to CSV and Excel",
      status: "in-progress",
      totalVotes: 143,
      votesThisWeek: 15,
      votesLastWeek: 8,
    },
    {
      id: "5",
      title: "Mobile app for iOS and Android",
      status: "reviewing",
      totalVotes: 76,
      votesThisWeek: 12,
      votesLastWeek: 5,
    },
    {
      id: "7",
      title: "Zapier and Make integration",
      status: "open",
      totalVotes: 43,
      votesThisWeek: 9,
      votesLastWeek: 3,
    },
  ],
  statusBreakdown: [
    { status: "open", count: 54 },
    { status: "reviewing", count: 23 },
    { status: "planned", count: 18 },
    { status: "in-progress", count: 12 },
    { status: "completed", count: 28 },
    { status: "closed", count: 7 },
  ],
  activityOverTime: [
    { period: "2026-04-20", count: 8 },
    { period: "2026-04-27", count: 12 },
    { period: "2026-05-04", count: 6 },
    { period: "2026-05-11", count: 17 },
    { period: "2026-05-18", count: 9 },
  ],
  tagBreakdown: [
    {
      tagName: "Performance",
      tagColor: "#3b82f6",
      postCount: 28,
      totalVotes: 201,
    },
    {
      tagName: "UX / Design",
      tagColor: "#8b5cf6",
      postCount: 22,
      totalVotes: 167,
    },
    {
      tagName: "Integrations",
      tagColor: "#f59e0b",
      postCount: 19,
      totalVotes: 134,
    },
    { tagName: "Mobile", tagColor: "#10b981", postCount: 15, totalVotes: 98 },
    { tagName: "Security", tagColor: "#ef4444", postCount: 11, totalVotes: 76 },
  ],
  funnel: [
    {
      fromStatus: "open",
      toStatus: "reviewing",
      avgDays: 4.2,
      transitionCount: 38,
    },
    {
      fromStatus: "reviewing",
      toStatus: "planned",
      avgDays: 7.1,
      transitionCount: 24,
    },
    {
      fromStatus: "planned",
      toStatus: "in-progress",
      avgDays: 12.4,
      transitionCount: 18,
    },
    {
      fromStatus: "in-progress",
      toStatus: "completed",
      avgDays: 21.8,
      transitionCount: 14,
    },
  ],
  boards: [
    {
      boardId: "b1",
      boardName: "Product Feedback",
      totalPosts: 87,
      openPosts: 34,
      resolvedPosts: 29,
      totalVotes: 562,
      avgVotesPerPost: 6.5,
      resolutionRate: 33,
    },
    {
      boardId: "b2",
      boardName: "Bug Reports",
      totalPosts: 35,
      openPosts: 12,
      resolvedPosts: 14,
      totalVotes: 187,
      avgVotesPerPost: 5.3,
      resolutionRate: 40,
    },
    {
      boardId: "b3",
      boardName: "Feature Requests",
      totalPosts: 20,
      openPosts: 8,
      resolvedPosts: 5,
      totalVotes: 144,
      avgVotesPerPost: 7.2,
      resolutionRate: 25,
    },
  ],
  completedPosts: [
    {
      id: "c1",
      title: "Two-factor authentication for all users",
      voteCount: 98,
      completedAt: "2026-05-15",
    },
    {
      id: "c2",
      title: "Email notification preferences",
      voteCount: 67,
      completedAt: "2026-05-10",
    },
    {
      id: "c3",
      title: "Keyboard shortcuts for power users",
      voteCount: 45,
      completedAt: "2026-05-05",
    },
    {
      id: "c4",
      title: "Responsive design improvements",
      voteCount: 38,
      completedAt: "2026-04-28",
    },
  ],
  changelogEngagement: [],
  adminActivity: [],
  companyEngagement: [],
  range: "30d" as const,
  fetchedAt: Date.now(),
};
// END MOCK DATA

export default function AnalyticsPage({ loaderData }: Route.ComponentProps) {
  const data = USE_MOCK ? { ...loaderData, ...MOCK_OVERRIDE } : loaderData;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-3 border-b shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <h1 className="text-lg font-bold">Analytics</h1>
            </div>
          </div>
          <AnalyticsOverview data={data} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
