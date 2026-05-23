import { parseChangelogSettings } from "@features/changelog/server/changelog-settings";
import { verifyIdentityToken } from "@lib/identity-token";
import { getSession } from "@lib/session";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { getDb } from "@/db";
import {
  changelogs as changelogsTable,
  comments,
  feedbackBoards,
  feedbackPosts,
  member,
  organization,
  user as userTable,
  votes,
  widgetConfigs,
} from "@/db/schema";
import type { PublicBoard, PublicChangelog, PublicPost, SessionUser } from "../schemas/public";
import { generateUserAlias, toStatusKey } from "../utils";

export async function publicPageLoader({ request, params }: LoaderFunctionArgs) {
  const db = getDb();
  const orgSlug = params.orgSlug as string;

  const org = await db.query.organization.findFirst({
    where: eq(organization.slug, orgSlug),
    columns: { id: true, name: true, slug: true, metadata: true },
  });
  if (!org) throw new Response("Not found", { status: 404 });
  const { emailSubscriptionsEnabled } = parseChangelogSettings(org.metadata ?? null);

  const customDomain = request.headers.get("x-custom-domain") ?? null;

  const session = await getSession(request);
  const sessionUser: SessionUser | null = session
    ? {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email,
        image: session.user.image ?? null,
      }
    : null;

  const url = new URL(request.url);
  const fdyToken = url.searchParams.get("_fdy");
  let publicUser: { id: string; email: string; name?: string } | null = null;
  let widgetToken: string | null = null;

  const widgetConfig = await db.query.widgetConfigs.findFirst({
    where: eq(widgetConfigs.organizationId, org.id),
    columns: { signingSecret: true, token: true },
  });

  if (widgetConfig) {
    widgetToken = widgetConfig.token;
    if (fdyToken && widgetConfig.signingSecret) {
      publicUser = await verifyIdentityToken(fdyToken, widgetConfig.signingSecret);
    }
  }

  const boards = await db.query.feedbackBoards.findMany({
    where: and(eq(feedbackBoards.organizationId, org.id), eq(feedbackBoards.visibility, "public")),
    orderBy: [desc(feedbackBoards.isDefault), desc(feedbackBoards.createdAt)],
    columns: { id: true, name: true, slug: true, isDefault: true, anonymizeUsers: true },
  });

  const boardIds = boards.map((b) => b.id);
  const boardMap = Object.fromEntries(boards.map((b) => [b.id, b.name]));
  const boardAnonymizeMap = Object.fromEntries(boards.map((b) => [b.id, b.anonymizeUsers]));
  const publicBoards: PublicBoard[] = boards.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    isDefault: b.isDefault,
    anonymizeUsers: b.anonymizeUsers,
  }));

  if (boardIds.length === 0) {
    return data({
      org: { id: org.id, name: org.name ?? "", slug: org.slug ?? "" },
      boards: publicBoards,
      posts: [] as PublicPost[],
      changelogEntries: [] as PublicChangelog[],
      upNextPosts: [] as { id: string; title: string; voteCount: number }[],
      votedPostIds: [] as string[],
      customDomain,
      sessionUser,
      publicUser,
      widgetToken,
      emailSubscriptionsEnabled,
    });
  }

  const rawPosts = await db.query.feedbackPosts.findMany({
    where: and(eq(feedbackPosts.organizationId, org.id), inArray(feedbackPosts.boardId, boardIds)),
    orderBy: [desc(feedbackPosts.createdAt)],
    columns: {
      id: true,
      title: true,
      description: true,
      status: true,
      boardId: true,
      createdBy: true,
      isPublicSubmission: true,
    },
  });

  const postIds = rawPosts.map((p) => p.id);

  const [allVotes, commentCountRows] = await Promise.all([
    postIds.length > 0
      ? db
          .select({ postId: votes.postId, userId: votes.userId })
          .from(votes)
          .where(inArray(votes.postId, postIds))
      : Promise.resolve([]),
    postIds.length > 0
      ? db
          .select({
            postId: comments.postId,
            count: sql<number>`count(*)`.mapWith(Number),
          })
          .from(comments)
          .where(inArray(comments.postId, postIds))
          .groupBy(comments.postId)
      : Promise.resolve([]),
  ]);

  const voteCountMap = allVotes.reduce<Record<string, number>>((acc, v) => {
    acc[v.postId] = (acc[v.postId] ?? 0) + 1;
    return acc;
  }, {});

  const uniqueUserIds = [
    ...new Set(rawPosts.map((p) => p.createdBy).filter((id): id is string => id != null)),
  ];
  const [users, adminMembers] = await Promise.all([
    uniqueUserIds.length > 0
      ? db.query.user.findMany({
          where: inArray(userTable.id, uniqueUserIds),
          columns: { id: true, name: true },
        })
      : Promise.resolve([]),
    uniqueUserIds.length > 0
      ? db
          .select({ userId: member.userId })
          .from(member)
          .where(
            and(
              eq(member.organizationId, org.id),
              inArray(member.userId, uniqueUserIds),
            ),
          )
      : Promise.resolve([]),
  ]);
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const adminUserIds = new Set(adminMembers.map((m) => m.userId));
  const commentCountMap = Object.fromEntries(commentCountRows.map((r) => [r.postId, r.count]));

  const posts: PublicPost[] = rawPosts.map((post) => {
    const authorId = post.createdBy ?? "";
    const isAnonymousBoard = boardAnonymizeMap[post.boardId] ?? false;
    const isAdmin = adminUserIds.has(authorId);
    let authorName: string;
    if (post.isPublicSubmission) {
      authorName = isAnonymousBoard ? generateUserAlias(`pub-${post.id}`) : "Anonymous";
    } else if (isAnonymousBoard && !isAdmin) {
      authorName = generateUserAlias(authorId);
    } else {
      authorName = userMap[authorId] ?? "Anonymous";
    }
    return {
      id: post.id,
      title: post.title,
      description: post.description ?? null,
      status: toStatusKey(post.status),
      boardId: post.boardId,
      boardName: boardMap[post.boardId] ?? "",
      authorName,
      authorIsAdmin: isAdmin,
      voteCount: voteCountMap[post.id] ?? 0,
      commentCount: commentCountMap[post.id] ?? 0,
    };
  });

  const rawChangelogs = await db.query.changelogs.findMany({
    where: and(eq(changelogsTable.organizationId, org.id), eq(changelogsTable.status, "published")),
    orderBy: [desc(changelogsTable.publishedAt)],
    columns: { id: true, title: true, slug: true, body: true, publishedAt: true, createdBy: true },
  });

  const changelogUserIds = [
    ...new Set(rawChangelogs.map((c) => c.createdBy).filter((id): id is string => id != null)),
  ];
  const changelogUsers =
    changelogUserIds.length > 0
      ? await db.query.user.findMany({
          where: inArray(userTable.id, changelogUserIds),
          columns: { id: true, name: true },
        })
      : [];
  const changelogUserMap = Object.fromEntries(changelogUsers.map((u) => [u.id, u.name]));

  const changelogEntries: PublicChangelog[] = rawChangelogs.map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    publishedAt: c.publishedAt?.toISOString() ?? c.id,
    body: c.body,
    authorName: changelogUserMap[c.createdBy] ?? "Team",
  }));

  const upNextPosts = posts
    .filter((p) => p.status === "planned")
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, 3)
    .map((p) => ({ id: p.id, title: p.title, voteCount: p.voteCount }));

  const votedPostIds = sessionUser
    ? allVotes.filter((v) => v.userId === sessionUser.id).map((v) => v.postId)
    : [];

  return data({
    org: { id: org.id, name: org.name ?? "", slug: org.slug ?? "" },
    boards: publicBoards,
    posts,
    changelogEntries,
    upNextPosts,
    votedPostIds,
    customDomain,
    sessionUser,
    publicUser,
    widgetToken,
    emailSubscriptionsEnabled,
  });
}
