import { requireOrganization } from "@features/auth/server/guards";
import { notifyVoteMilestoneIfReached } from "@features/internal/notifications/server/service";
import { and, count, eq } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { votes } from "@/db/schema";

import type { Route } from "./+types/votes";

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);

  const body = (await request.json()) as { postId: string };
  const { postId } = body;
  if (!postId) return data({ error: "postId required" }, { status: 400 });

  const db = getDb();

  const existing = await db.query.votes.findFirst({
    where: and(eq(votes.postId, postId), eq(votes.userId, session.user.id)),
  });

  if (existing) {
    await db.delete(votes).where(and(eq(votes.postId, postId), eq(votes.userId, session.user.id)));
    return data({ voted: false });
  }

  await db.insert(votes).values({
    postId,
    userId: session.user.id,
    organizationId,
  });

  const [row] = await db.select({ count: count() }).from(votes).where(eq(votes.postId, postId));
  const newVoteCount = row?.count ?? 0;

  notifyVoteMilestoneIfReached({ postId, organizationId, newVoteCount }).catch(() => {});

  return data({ voted: true });
}
