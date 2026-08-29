import { PageHeader } from "@components/common/page-header";
import { RouteErrorMessage } from "@components/common/route-error";
import { SettingsContentSkeleton } from "@components/common/settings-skeleton";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { FeedbackSettingsPanel } from "@features/feedback/components/settings/feedback-settings-panel";
import type { FeedbackBoard } from "@features/feedback/components/settings/types";
import { getOrgCategories } from "@features/feedback/server/categories";
import { parseFeedbackSettings } from "@features/feedback/server/feedback-settings";
import { getOrgTags } from "@features/feedback/server/tags";
import { and, desc, eq, sql } from "drizzle-orm";
import { MessageSquare } from "lucide-react";
import { Suspense } from "react";
import { Await } from "react-router";
import { feedbackBoards, feedbackPosts, member, organization } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/feedback";

type FeedbackData = {
  boards: Omit<FeedbackBoard, "color">[];
  isAdmin: boolean;
  limit: number;
  tags: { id: string; name: string; color: string }[];
  categories: { id: string; name: string; color: string }[];
  enableRoadmap: boolean;
  weeklyDigest: boolean;
};

export function meta() {
  return [{ title: "Feedback Settings | Feeduro" }];
}

export function shouldRevalidate() {
  return false;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

  const dataPromise: Promise<FeedbackData> = Promise.all([
    db.query.feedbackBoards.findMany({
      where: eq(feedbackBoards.organizationId, organizationId),
      orderBy: [desc(feedbackBoards.isDefault), desc(feedbackBoards.createdAt)],
    }),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      columns: { role: true },
    }),
    db
      .select({
        boardId: feedbackPosts.boardId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(feedbackPosts)
      .where(eq(feedbackPosts.organizationId, organizationId))
      .groupBy(feedbackPosts.boardId),
    db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
      columns: { metadata: true },
    }),
    getOrgTags(db, organizationId).catch(() => [] as { id: string; name: string; color: string }[]),
    getOrgCategories(db, organizationId).catch(() => [] as { id: string; name: string; color: string }[]),
  ]).then(([boards, memberRecord, countRows, org, tags, categories]) => {
    const countMap = Object.fromEntries(countRows.map((r) => [r.boardId, r.count]));
    const feedbackSettings = parseFeedbackSettings(org?.metadata ?? null);
    return {
      boards: boards.map((b) => ({ ...b, postCount: countMap[b.id] ?? 0 })),
      isAdmin: memberRecord?.role === "admin",
      limit: 2,
      tags,
      categories,
      ...feedbackSettings,
    };
  });

  return { dataPromise };
}

export function ErrorBoundary() {
  return <RouteErrorMessage resource="feedback settings" />;
}

export default function FeedbackSettingsRoute({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
      </header>
      <Suspense fallback={<SettingsContentSkeleton />}>
        <Await
          resolve={loaderData.dataPromise as unknown as Promise<FeedbackData>}
          errorElement={<RouteErrorMessage resource="feedback settings" />}
        >
          {(pageData) => (
            <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
              <PageHeader
                title="Feedback"
                icon={MessageSquare}
                description="Configure feedback behavior, boards, tags, and categories for your workspace."
              />
              <FeedbackSettingsPanel
                boards={pageData.boards}
                tags={pageData.tags}
                categories={pageData.categories}
                isAdmin={pageData.isAdmin}
                limit={pageData.limit}
                enableRoadmap={pageData.enableRoadmap}
                weeklyDigest={pageData.weeklyDigest}
              />
            </main>
          )}
        </Await>
      </Suspense>
    </>
  );
}
