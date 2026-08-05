import { RouteErrorMessage } from "@components/common/route-error";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { getBoards, getEnrichedPosts } from "@features/feedback/server/queries";
import { getOrgTags } from "@features/feedback/server/tags";
import { DashboardContent } from "@features/internal/dashboard/components/dashboard-content";
import { DashboardSkeleton } from "@features/internal/dashboard/components/dashboard-skeleton";
import { getOrgViews } from "@features/internal/dashboard/server/views";
import type { DashboardLoaderData, Tag, View } from "@features/internal/dashboard/types";
import { eq } from "drizzle-orm";
import { Suspense } from "react";
import type { ShouldRevalidateFunctionArgs } from "react-router";
import { Await, redirect } from "react-router";
import { member, user as userTable } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/dashboard";

export function meta() {
	return [{ title: "Requests – Feeduro" }];
}

export function shouldRevalidate() {
	return false;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const db = getDb(context);
	const { session, org } = await requireOrgBySlug(db, request, params.orgSlug);

	const boardsData = await getBoards(db, org.id);
	if (boardsData.boards.length === 0) {
		throw redirect(`/${params.orgSlug}/settings/feedback`);
	}

	const dataPromise = Promise.all([
		db
			.select({ userId: member.userId, name: userTable.name, image: userTable.image, role: member.role })
			.from(member)
			.innerJoin(userTable, eq(member.userId, userTable.id))
			.where(eq(member.organizationId, org.id)),
		getEnrichedPosts(db, org.id, session.user.id),
		getOrgViews(db, org.id).catch(() => [] as View[]),
		getOrgTags(db, org.id).catch(() => [] as Tag[]),
	]).then(([orgMembers, posts, views, tagList]) => {
		const currentMember = orgMembers.find((m) => m.userId === session.user.id);
		return {
			user: session.user,
			isAdmin: currentMember?.role === "admin",
			usersMap: Object.fromEntries(
				orgMembers.map((m) => [m.userId, { name: m.name, image: m.image }]),
			),
			orgMembers: orgMembers.map((m) => ({ id: m.userId, name: m.name, image: m.image })),
			posts,
			boards: boardsData.boards,
			statusCounts: boardsData.statusCounts,
			boardsLimit: boardsData.limit,
			views,
			tags: tagList,
			fetchedAt: Date.now(),
		};
	});

	return { dataPromise };
}

export function ErrorBoundary() {
	return <RouteErrorMessage resource="requests" />;
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
	return (
		<Suspense fallback={<DashboardSkeleton />}>
			<Await
				resolve={loaderData.dataPromise as unknown as Promise<DashboardLoaderData>}
				errorElement={<RouteErrorMessage resource="requests" />}
			>
				{(data) => <DashboardContent data={data} />}
			</Await>
		</Suspense>
	);
}
