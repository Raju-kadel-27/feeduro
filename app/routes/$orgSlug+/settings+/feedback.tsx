import { FeedbackSettingsPanel } from "@features/feedback/components/settings/feedback-settings-panel";
import { AppSidebar } from "@features/layout/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { getOrgCategories } from "@features/feedback/server/categories.server";
import { getOrgTags } from "@features/feedback/server/tags.server";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { getEnv } from "@utils/get-env";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackBoards, feedbackPosts, member, organization } from "@/db/schema";

import { parseFeedbackSettings } from "@features/feedback/server/feedback-settings";
import type { Route } from "./+types/feedback";

export function meta() {
  return [{ title: "Feedback Settings — Feediyo" }];
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
  const geminiConfigured = !!getEnv().GEMINI_API_KEY;

  return {
    boards: boards.map((b) => ({ ...b, postCount: countMap[b.id] ?? 0 })),
    isAdmin: memberRecord?.role === "admin",
    limit: 2,
    tags,
    categories,
    geminiConfigured,
    ...feedbackSettings,
  };
}

export default function FeedbackSettingsRoute({ loaderData }: Route.ComponentProps) {
  const { boards, isAdmin, limit, enableRoadmap, weeklyDigest, tags, categories, geminiConfigured } = loaderData;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">Feedback</span>
        </header>

        <main className="p-6 flex items-center justify-center max-w-3xl mx-auto">
          <FeedbackSettingsPanel
            boards={boards}
            tags={tags}
            categories={categories}
            isAdmin={isAdmin ?? false}
            limit={limit}
            enableRoadmap={enableRoadmap}
            weeklyDigest={weeklyDigest}
            geminiConfigured={geminiConfigured}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
