import { FeedbackSettingsPanel } from "@components/feedback/settings/feedback-settings-panel";
import { AppSidebar } from "@components/layout/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { requireOrgBySlug } from "@lib/session.server";
import { parseFeedbackSettings } from "@routes/api+/feedback-settings";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackBoards, feedbackPosts, member, organization } from "@/db/schema";
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

  const countMap = Object.fromEntries(countRows.map((r) => [r.boardId, r.count]));
  const feedbackSettings = parseFeedbackSettings(org?.metadata ?? null);

  return {
    boards: boards.map((b) => ({ ...b, postCount: countMap[b.id] ?? 0 })),
    isAdmin: memberRecord?.role === "admin",
    limit: 2,
    ...feedbackSettings,
  };
}

export default function FeedbackSettingsRoute({ loaderData }: Route.ComponentProps) {
  const { boards, isAdmin, limit, enableRoadmap, weeklyDigest } = loaderData;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">Feedback</span>
        </header>

        <main className="p-6 max-w-[640px] mx-auto w-full">
          <FeedbackSettingsPanel
            boards={boards}
            tags={[]}
            isAdmin={isAdmin ?? false}
            limit={limit}
            enableRoadmap={enableRoadmap}
            weeklyDigest={weeklyDigest}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
