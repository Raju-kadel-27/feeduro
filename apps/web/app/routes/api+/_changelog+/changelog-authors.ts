import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { changelogAuthors, changelogs, user } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/changelog-authors";

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);
  await requirePermission(db, organizationId, session.user.id, { changelog: ["update"] });

  const body = (await request.json()) as { intent: string; changelogId?: string; userId?: string };
  const { intent, changelogId, userId } = body;
  if (!changelogId) return data({ error: "changelogId is required" }, { status: 400 });

  const entry = await db.query.changelogs.findFirst({
    where: and(eq(changelogs.id, changelogId), eq(changelogs.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!entry) return data({ error: "Not found" }, { status: 404 });

  if (intent === "add-author") {
    if (!userId) return data({ error: "userId is required" }, { status: 400 });
    const u = await db.query.user.findFirst({ where: eq(user.id, userId), columns: { id: true } });
    if (!u) return data({ error: "User not found" }, { status: 404 });
    await db
      .insert(changelogAuthors)
      .values({ changelogId, userId, organizationId })
      .onConflictDoNothing();
    return data({ success: true });
  }

  if (intent === "remove-author") {
    if (!userId) return data({ error: "userId is required" }, { status: 400 });
    await db
      .delete(changelogAuthors)
      .where(
        and(
          eq(changelogAuthors.changelogId, changelogId),
          eq(changelogAuthors.userId, userId),
          eq(changelogAuthors.organizationId, organizationId),
        ),
      );
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
