import type { DateRange } from "../schemas/analytics";

function daysAgo(n: number): string {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d.toISOString().slice(0, 10);
}

function monthStart(monthsBack: number): string {
	const d = new Date();
	d.setDate(1);
	d.setMonth(d.getMonth() - monthsBack);
	return d.toISOString().slice(0, 10);
}

const BOARD_VISITOR_DATA = [
	{ uniqueVisitors: 89, totalViews: 234 },
	{ uniqueVisitors: 102, totalViews: 271 },
	{ uniqueVisitors: 94, totalViews: 248 },
	{ uniqueVisitors: 121, totalViews: 318 },
	{ uniqueVisitors: 113, totalViews: 297 },
	{ uniqueVisitors: 87, totalViews: 229 },
	{ uniqueVisitors: 134, totalViews: 352 },
];

const ROADMAP_VISITOR_DATA = [
	{ uniqueVisitors: 54, totalViews: 138 },
	{ uniqueVisitors: 63, totalViews: 162 },
	{ uniqueVisitors: 58, totalViews: 147 },
	{ uniqueVisitors: 79, totalViews: 201 },
	{ uniqueVisitors: 71, totalViews: 183 },
	{ uniqueVisitors: 52, totalViews: 134 },
	{ uniqueVisitors: 86, totalViews: 218 },
];

export function getDemoAnalyticsData() {
	const boardVisitorsChart = BOARD_VISITOR_DATA.map((d, i) => ({
		period: daysAgo(6 - i),
		...d,
	}));
	const roadmapVisitorsChart = ROADMAP_VISITOR_DATA.map((d, i) => ({
		period: daysAgo(6 - i),
		...d,
	}));

	return {
		range: "all" as DateRange,
		boardId: undefined as string | undefined,
		fetchedAt: Date.now(),
		user: null,
		stats: {
			totalPosts: 247,
			totalVotes: 1839,
			resolutionRate: 38,
			avgVotesPerPost: 7.4,
			deltas: null,
		},
		boards: [
			{
				boardId: "demo-board-1",
				boardName: "Product Feedback",
				totalPosts: 138,
				openPosts: 86,
				resolvedPosts: 52,
				totalVotes: 1024,
				avgVotesPerPost: 7.4,
				resolutionRate: 37.7,
			},
			{
				boardId: "demo-board-2",
				boardName: "Bug Reports",
				totalPosts: 72,
				openPosts: 44,
				resolvedPosts: 28,
				totalVotes: 521,
				avgVotesPerPost: 7.2,
				resolutionRate: 38.9,
			},
			{
				boardId: "demo-board-3",
				boardName: "Integrations",
				totalPosts: 37,
				openPosts: 22,
				resolvedPosts: 15,
				totalVotes: 294,
				avgVotesPerPost: 7.9,
				resolutionRate: 40.5,
			},
		],
		topPosts: [
			{ id: "demo-p1", title: "Dark mode support", status: "open", voteCount: 142, uniqueCompanies: 38 },
			{ id: "demo-p2", title: "Export data to CSV", status: "planned", voteCount: 117, uniqueCompanies: 31 },
			{ id: "demo-p3", title: "Bulk status updates", status: "open", voteCount: 98, uniqueCompanies: 27 },
			{ id: "demo-p4", title: "Custom email notifications", status: "in-progress", voteCount: 86, uniqueCompanies: 22 },
			{ id: "demo-p5", title: "Slack integration improvements", status: "open", voteCount: 74, uniqueCompanies: 19 },
			{ id: "demo-p6", title: "Mobile app", status: "open", voteCount: 68, uniqueCompanies: 17 },
			{ id: "demo-p7", title: "Zapier integration", status: "planned", voteCount: 61, uniqueCompanies: 15 },
			{ id: "demo-p8", title: "Public API access", status: "open", voteCount: 53, uniqueCompanies: 14 },
		],
		statusBreakdown: [
			{ status: "open", count: 152 },
			{ status: "in-progress", count: 23 },
			{ status: "planned", count: 34 },
			{ status: "completed", count: 94 },
			{ status: "closed", count: 12 },
		],
		activityOverTime: [
			{ period: monthStart(11), count: 12 },
			{ period: monthStart(10), count: 19 },
			{ period: monthStart(9), count: 24 },
			{ period: monthStart(8), count: 18 },
			{ period: monthStart(7), count: 33 },
			{ period: monthStart(6), count: 41 },
			{ period: monthStart(5), count: 38 },
			{ period: monthStart(4), count: 52 },
			{ period: monthStart(3), count: 61 },
			{ period: monthStart(2), count: 74 },
			{ period: monthStart(1), count: 87 },
			{ period: monthStart(0), count: 91 },
		],
		votesOverTime: [
			{ period: monthStart(11), count: 58 },
			{ period: monthStart(10), count: 89 },
			{ period: monthStart(9), count: 112 },
			{ period: monthStart(8), count: 94 },
			{ period: monthStart(7), count: 167 },
			{ period: monthStart(6), count: 203 },
			{ period: monthStart(5), count: 188 },
			{ period: monthStart(4), count: 261 },
			{ period: monthStart(3), count: 314 },
			{ period: monthStart(2), count: 378 },
			{ period: monthStart(1), count: 441 },
			{ period: monthStart(0), count: 462 },
		],
		completedPosts: [
			{ id: "demo-cp1", title: "Add webhook support", voteCount: 89, completedAt: daysAgo(5) },
			{ id: "demo-cp2", title: "CSV export for feedback", voteCount: 67, completedAt: daysAgo(12) },
			{ id: "demo-cp3", title: "Markdown in post descriptions", voteCount: 54, completedAt: daysAgo(19) },
			{ id: "demo-cp4", title: "Merge duplicate posts", voteCount: 47, completedAt: daysAgo(28) },
			{ id: "demo-cp5", title: "Admin-only internal notes", voteCount: 38, completedAt: daysAgo(35) },
		],
		tagBreakdown: [
			{ tagName: "UI/UX", tagColor: "#6366f1", postCount: 48, totalVotes: 372 },
			{ tagName: "Performance", tagColor: "#f97316", postCount: 31, totalVotes: 241 },
			{ tagName: "Integration", tagColor: "#22c55e", postCount: 27, totalVotes: 198 },
			{ tagName: "API", tagColor: "#3b82f6", postCount: 22, totalVotes: 167 },
			{ tagName: "Mobile", tagColor: "#ec4899", postCount: 19, totalVotes: 143 },
			{ tagName: "Security", tagColor: "#f59e0b", postCount: 14, totalVotes: 98 },
		],
		trendingPosts: [
			{ id: "demo-tr1", title: "Dark mode support", status: "open", totalVotes: 142, votesThisWeek: 18, votesLastWeek: 9 },
			{ id: "demo-tr2", title: "Offline mode", status: "open", totalVotes: 87, votesThisWeek: 12, votesLastWeek: 5 },
			{ id: "demo-tr3", title: "Team collaboration features", status: "planned", totalVotes: 64, votesThisWeek: 9, votesLastWeek: 3 },
			{ id: "demo-tr4", title: "Import from Trello", status: "open", totalVotes: 51, votesThisWeek: 7, votesLastWeek: 2 },
		],
		changelogEngagement: [
			{ changelogId: "demo-cl1", title: "New dashboard & analytics", publishedAt: daysAgo(14), totalViews: 423, uniqueReaders: 178 },
			{ changelogId: "demo-cl2", title: "Improved notification system", publishedAt: daysAgo(28), totalViews: 312, uniqueReaders: 134 },
			{ changelogId: "demo-cl3", title: "Bulk actions for admins", publishedAt: daysAgo(45), totalViews: 267, uniqueReaders: 112 },
		],
		adminActivity: [
			{ userId: "demo-u1", name: "Sarah Chen", email: "sarah@yourco.com", role: "admin", postsSubmitted: 34, votesCast: 127, commentsLeft: 89 },
			{ userId: "demo-u2", name: "Marcus Webb", email: "marcus@yourco.com", role: "member", postsSubmitted: 18, votesCast: 94, commentsLeft: 42 },
			{ userId: "demo-u3", name: "Priya Patel", email: "priya@yourco.com", role: "member", postsSubmitted: 12, votesCast: 76, commentsLeft: 31 },
			{ userId: "demo-u4", name: "Jake Morrison", email: "jake@yourco.com", role: "viewer", postsSubmitted: 4, votesCast: 38, commentsLeft: 9 },
		],
		companyEngagement: [
			{ domain: "stripe.com", userCount: 7, postsSubmitted: 23, votesCast: 184, commentsLeft: 67, lastActive: daysAgo(1) },
			{ domain: "linear.app", userCount: 4, postsSubmitted: 14, votesCast: 112, commentsLeft: 38, lastActive: daysAgo(2) },
			{ domain: "vercel.com", userCount: 3, postsSubmitted: 9, votesCast: 87, commentsLeft: 24, lastActive: daysAgo(3) },
			{ domain: "shopify.com", userCount: 6, postsSubmitted: 21, votesCast: 167, commentsLeft: 58, lastActive: daysAgo(1) },
			{ domain: "notion.so", userCount: 5, postsSubmitted: 17, votesCast: 143, commentsLeft: 51, lastActive: daysAgo(4) },
			{ domain: "figma.com", userCount: 2, postsSubmitted: 6, votesCast: 54, commentsLeft: 18, lastActive: daysAgo(7) },
		],
		boardVisitors: {
			chart: boardVisitorsChart,
			totalViews: BOARD_VISITOR_DATA.reduce((s, d) => s + d.totalViews, 0),
			uniqueVisitors: BOARD_VISITOR_DATA.reduce((s, d) => s + d.uniqueVisitors, 0),
		},
		roadmapVisitors: {
			chart: roadmapVisitorsChart,
			totalViews: ROADMAP_VISITOR_DATA.reduce((s, d) => s + d.totalViews, 0),
			uniqueVisitors: ROADMAP_VISITOR_DATA.reduce((s, d) => s + d.uniqueVisitors, 0),
		},
		commentsAnalytics: {
			totalComments: 312,
			delta: 14,
			topPosts: [
				{ id: "demo-p1", title: "Dark mode support", status: "open", commentCount: 28 },
				{ id: "demo-p4", title: "Custom email notifications", status: "in-progress", commentCount: 21 },
				{ id: "demo-p2", title: "Export data to CSV", status: "planned", commentCount: 17 },
				{ id: "demo-p3", title: "Bulk status updates", status: "open", commentCount: 14 },
			],
		},
		unrespondedPosts: [],
		resolutionTime: { avgDays: 14.2, medianDays: 9.5, resolvedCount: 94 },
		responseRate: { totalPosts: 247, respondedPosts: 187, responseRate: 75.7, avgFirstResponseHours: 4.2 },
		backlogAging: { bucket0to7: 42, bucket8to30: 68, bucket31to90: 31, bucket90plus: 11, total: 152 },
		subscriberMetrics: { activeSubscribers: 0, newSubscribers: 0, unsubscribed: 0, totalSubscribers: 0 },
	};
}
