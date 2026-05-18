import { getSession } from "@lib/session";
import { and, count, eq } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { feedbackBoards, feedbackPosts, organization, votes } from "@/db/schema";

import type { Route } from "./+types/public-vote";

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request);
  if (!session) return data({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { postId: string; orgSlug: string };
  const { postId, orgSlug } = body;
  if (!postId || !orgSlug) return data({ error: "postId and orgSlug required" }, { status: 400 });

  const db = getDb();

  const post = await db.query.feedbackPosts.findFirst({
    where: eq(feedbackPosts.id, postId),
    columns: { id: true, boardId: true, organizationId: true },
  });
  if (!post) return data({ error: "Post not found" }, { status: 404 });

  const org = await db.query.organization.findFirst({
    where: eq(organization.slug, orgSlug),
    columns: { id: true },
  });
  if (!org || post.organizationId !== org.id) return data({ error: "Not found" }, { status: 404 });

  const board = await db.query.feedbackBoards.findFirst({
    where: and(eq(feedbackBoards.id, post.boardId), eq(feedbackBoards.visibility, "public")),
    columns: { id: true },
  });
  if (!board) return data({ error: "Not found" }, { status: 404 });

  const existing = await db.query.votes.findFirst({
    where: and(eq(votes.postId, postId), eq(votes.userId, session.user.id)),
    columns: { id: true },
  });

  if (existing) {
    await db.delete(votes).where(and(eq(votes.postId, postId), eq(votes.userId, session.user.id)));
  } else {
    await db.insert(votes).values({
      postId,
      userId: session.user.id,
      organizationId: org.id,
    });
  }

  const [result] = await db
    .select({ voteCount: count() })
    .from(votes)
    .where(eq(votes.postId, postId));

  return data({ voted: !existing, voteCount: result.voteCount });
}
