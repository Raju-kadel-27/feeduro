import { PageHeader } from "@components/common/page-header";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { FeedbackSettingsPanel } from "@features/feedback/components/settings/feedback-settings-panel";
import { getOrgCategories } from "@features/feedback/server/categories.server";
import { parseFeedbackSettings } from "@features/feedback/server/feedback-settings";
import { getOrgTags } from "@features/feedback/server/tags.server";
import { and, desc, eq, sql } from "drizzle-orm";
import { MessageSquare } from "lucide-react";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { getDb } from "@/db";
import { feedbackBoards, feedbackPosts, member, organization } from "@/db/schema";
import type { Route } from "./+types/feedback";

export function meta() {
  return [{ title: "Feedback Settings — Feeduro" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const [boards, memberRecord, countRows, org] = await Promise.all([
    db.query.feedbackBoards.findMany({
      where: eq(feedbackBoards.organizationId, organizationId),
      orderBy: [desc(feedbackBoards.isDefault), desc(feedbackBoards.createdAt)],
    }),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
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
    }),
  ]);

  let tags: { id: string; name: string; color: string }[] = [];
  let categories: { id: string; name: string; color: string }[] = [];
  try {
    [tags, categories] = await Promise.all([
      getOrgTags(organizationId),
      getOrgCategories(organizationId),
    ]);
  } catch {
    /* tables may not exist yet — run pnpm db:push */
  }

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
}

export default function FeedbackSettingsRoute({ loaderData }: Route.ComponentProps) {
  const {
    boards,
    isAdmin,
    limit,
    enableRoadmap,
    weeklyDigest,
    tags,
    categories,
  } = loaderData;

  return (
        <>
        <header className="flex h-14 shrink-0 items-center px-4">
          <SidebarTrigger className="-ml-1" />
        </header>

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
          <PageHeader
            title="Feedback"
            icon={MessageSquare}
            description="Configure feedback behavior, boards, tags, and categories for your workspace."
          />
          <FeedbackSettingsPanel
            boards={boards}
            tags={tags}
            categories={categories}
            isAdmin={isAdmin ?? false}
            limit={limit}
            enableRoadmap={enableRoadmap}
            weeklyDigest={weeklyDigest}
          />
        </main>
        </>
  );
}
