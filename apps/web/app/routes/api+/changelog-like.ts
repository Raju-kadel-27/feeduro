import { getSession } from "@lib/session";
import { and, count, eq } from "drizzle-orm";
import { data } from "react-router";
import { changelogLikes, changelogs, organization } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/changelog-like";

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const session = await getSession(db, request);
  if (!session) return data({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { changelogId: string; orgSlug: string };
  const { changelogId, orgSlug } = body;
  if (!changelogId || !orgSlug) return data({ error: "changelogId and orgSlug required" }, { status: 400 });

  const [org, changelog] = await Promise.all([
    db.query.organization.findFirst({
      where: eq(organization.slug, orgSlug),
      columns: { id: true },
    }),
    db.query.changelogs.findFirst({
      where: eq(changelogs.id, changelogId),
      columns: { id: true, organizationId: true },
    }),
  ]);

  if (!org || !changelog || changelog.organizationId !== org.id) {
    return data({ error: "Not found" }, { status: 404 });
  }

  const existing = await db.query.changelogLikes.findFirst({
    where: and(eq(changelogLikes.changelogId, changelogId), eq(changelogLikes.userId, session.user.id)),
    columns: { id: true },
  });

  if (existing) {
    await db.delete(changelogLikes).where(eq(changelogLikes.id, existing.id));
  } else {
    await db.insert(changelogLikes).values({
      changelogId,
      organizationId: org.id,
      userId: session.user.id,
    });
  }

  const [result] = await db
    .select({ likeCount: count() })
    .from(changelogLikes)
    .where(eq(changelogLikes.changelogId, changelogId));

  return data({ liked: !existing, likeCount: result.likeCount });
}
