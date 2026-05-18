import { requireOrganization } from "@features/auth/server/guards";
import { and, eq, sql } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { reactions } from "@/db/schema";

import type { Route } from "./+types/reactions";

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);
  const db = getDb();

  const body = (await request.json()) as { postId: string; type?: string };
  const { postId, type = "heart" } = body;

  if (!postId) return data({ error: "postId required" }, { status: 400 });

  const existing = await db.query.reactions.findFirst({
    where: and(
      eq(reactions.postId, postId),
      eq(reactions.userId, session.user.id),
      eq(reactions.type, type),
    ),
  });

  if (existing) {
    await db
      .delete(reactions)
      .where(
        and(
          eq(reactions.postId, postId),
          eq(reactions.userId, session.user.id),
          eq(reactions.type, type),
        ),
      );
  } else {
    await db.insert(reactions).values({
      postId,
      userId: session.user.id,
      organizationId,
      type,
    });
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(reactions)
    .where(and(eq(reactions.postId, postId), eq(reactions.type, type)));

  return data({ reacted: !existing, count: countRow?.count ?? 0 });
}
