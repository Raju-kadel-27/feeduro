import { requireOrgBySlug } from "@features/auth/server/guards";
import { getEnrichedPosts } from "@features/feedback/server/queries";
import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { feedbackBoards, integrations, user } from "@/db/schema";

export async function loadRoadmapData(db: Db, request: Request, orgSlug: string) {
  const { session, org } = await requireOrgBySlug(db, request, orgSlug);

  const [enrichedPosts, integration] = await Promise.all([
    getEnrichedPosts(db, org.id, session.user.id),
    db.query.integrations.findFirst({
      where: and(eq(integrations.organizationId, org.id), eq(integrations.provider, "github")),
      columns: { id: true },
    }),
  ]);

  let posts = enrichedPosts;

  if (enrichedPosts.length > 0) {
    const boardIds = [...new Set(enrichedPosts.map((p) => p.boardId))];
    const userIds = [...new Set(enrichedPosts.map((p) => p.createdBy).filter(Boolean))];

    const [boards, users] = await Promise.all([
      db
        .select({ id: feedbackBoards.id, name: feedbackBoards.name })
        .from(feedbackBoards)
        .where(inArray(feedbackBoards.id, boardIds)),
      userIds.length > 0
        ? db
            .select({ id: user.id, name: user.name, image: user.image })
            .from(user)
            .where(inArray(user.id, userIds))
        : Promise.resolve([]),
    ]);

    const boardMap = Object.fromEntries(boards.map((b) => [b.id, b.name]));
    const userMap = Object.fromEntries(users.map((u) => [u.id, { name: u.name, image: u.image }]));

    posts = enrichedPosts
      .map((p) => ({
        ...p,
        boardName: boardMap[p.boardId] ?? null,
        authorName: userMap[p.createdBy]?.name ?? null,
        authorImage: userMap[p.createdBy]?.image ?? null,
      }))
      .sort((a, b) => {
        if (a.rank == null && b.rank == null)
          return b.createdAt.getTime() - a.createdAt.getTime();
        if (a.rank == null) return 1;
        if (b.rank == null) return -1;
        return a.rank !== b.rank
          ? a.rank - b.rank
          : b.createdAt.getTime() - a.createdAt.getTime();
      });
  }

  return {
    user: session.user,
    posts,
    fetchedAt: Date.now(),
    hasGithubIntegration: !!integration,
  };
}
