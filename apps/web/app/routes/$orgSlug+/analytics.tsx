import { RouteErrorMessage } from "@components/common/route-error";
import { Skeleton } from "@components/ui/skeleton";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { BoardFilter } from "@features/internal/analytics/components/board-filter";
import { DateRangePicker } from "@features/internal/analytics/components/date-range-picker";
import { getDemoAnalyticsData } from "@features/internal/analytics/server/demo-data";
import { loadAnalyticsOverview } from "@features/internal/analytics/server/overview";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import { Star } from "lucide-react";
import { lazy, Suspense } from "react";
import { Await, Link, useParams } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/analytics";

const AnalyticsOverview = lazy(() =>
	import("@features/internal/analytics/components/analytics-overview").then((m) => ({
		default: m.AnalyticsOverview,
	})),
);

export function meta() {
	return [{ title: "Analytics – Feeduro" }];
}

export function shouldRevalidate({ currentUrl, nextUrl }: Route.ShouldRevalidateArgs) {
	return currentUrl.search !== nextUrl.search;
}

type OverviewData = Awaited<ReturnType<typeof loadAnalyticsOverview>>;
type AnalyticsData = OverviewData & { isDemo?: true };

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const db = getDb(context);
	const { organizationId } = await requireOrgBySlug(db, request, params.orgSlug);
	const dataPromise: Promise<AnalyticsData> = getOrgPlanLimits(db, organizationId).then((planLimits) => {
		if (!planLimits.analytics) return { ...getDemoAnalyticsData(), isDemo: true as const };
		return loadAnalyticsOverview(db, request, params.orgSlug, context);
	});
	return { dataPromise };
}

export function ErrorBoundary() {
	return <RouteErrorMessage resource="analytics" />;
}

export default function AnalyticsPage({ loaderData }: Route.ComponentProps) {
	return (
		<div className="flex flex-col overflow-y-auto">
			<Suspense fallback={<AnalyticsPageSkeleton />}>
				<Await
					resolve={loaderData.dataPromise as unknown as Promise<AnalyticsData>}
					errorElement={<RouteErrorMessage resource="analytics" />}
				>
					{(pageData) => <AnalyticsContent data={pageData} />}
				</Await>
			</Suspense>
		</div>
	);
}

function AnalyticsContent({ data }: { data: AnalyticsData }) {
	const { orgSlug } = useParams<{ orgSlug: string }>();
	const isDemo = "isDemo" in data;

	return (
		<>
			<div className="flex items-center justify-between px-6 py-3 border-b shrink-0">
				<div className="flex items-center gap-3">
					<h1 className="text-lg font-bold">Analytics</h1>
				</div>
				{!isDemo && (
					<div className="flex items-center gap-2">
						<BoardFilter boards={data.boards} />
						<DateRangePicker />
					</div>
				)}
			</div>
			{isDemo && (
				<div className="flex items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-6 py-2.5 shrink-0 dark:border-amber-900/40 dark:bg-amber-950/20">
					<div className="flex items-center gap-2.5">
						<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
							Example
						</span>
						<p className="text-sm text-amber-800 dark:text-amber-300">
							This is example data | upgrade to see your real analytics.
						</p>
					</div>
					<div className="flex shrink-0 items-center gap-3">
						<Link
							to={`/${orgSlug}/analytics`}
							reloadDocument
							className="text-xs text-amber-600 transition-colors hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
						>
							← Exit demo
						</Link>
						<Link
							to={`/${orgSlug}/settings/billing`}
							className="flex items-center gap-1.5 rounded-md bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
						>
							Upgrade{" "}
							<Star className="h-3 w-3 fill-amber-300 text-amber-300" aria-hidden="true" />
						</Link>
					</div>
				</div>
			)}
			<Suspense fallback={<AnalyticsOverviewSkeleton />}>
				<AnalyticsOverview data={data} />
			</Suspense>
		</>
	);
}

function AnalyticsPageSkeleton() {
	return (
		<>
			<div className="flex items-center px-6 py-3 border-b shrink-0">
				<div className="flex items-center gap-3">
					<h1 className="text-lg font-bold">Analytics</h1>
				</div>
			</div>
			<AnalyticsOverviewSkeleton />
		</>
	);
}

function AnalyticsOverviewSkeleton() {
	return (
		<div className="p-6 grid grid-cols-2 gap-4 md:grid-cols-4">
			{Array.from({ length: 4 }).map((_, i) => (
				<Skeleton key={i} className="h-24 rounded-xl" />
			))}
			<Skeleton className="col-span-2 h-64 rounded-xl md:col-span-4" />
			<Skeleton className="col-span-2 h-64 rounded-xl" />
			<Skeleton className="col-span-2 h-64 rounded-xl" />
		</div>
	);
}
