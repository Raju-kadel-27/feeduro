import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { changelogs, changelogTagItems, changelogTags } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/changelog-tag-items";

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);
  await requirePermission(db, organizationId, session.user.id, { changelog: ["update"] });

  const body = (await request.json()) as { intent: string; changelogId?: string; tagId?: string };
  const { intent, changelogId, tagId } = body;
  if (!changelogId) return data({ error: "changelogId is required" }, { status: 400 });

  const entry = await db.query.changelogs.findFirst({
    where: and(eq(changelogs.id, changelogId), eq(changelogs.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!entry) return data({ error: "Not found" }, { status: 404 });

  if (intent === "add-tag-item") {
    if (!tagId) return data({ error: "tagId is required" }, { status: 400 });
    const tag = await db.query.changelogTags.findFirst({
      where: and(eq(changelogTags.id, tagId), eq(changelogTags.organizationId, organizationId)),
      columns: { id: true },
    });
    if (!tag) return data({ error: "Tag not found" }, { status: 404 });
    await db
      .insert(changelogTagItems)
      .values({ changelogId, tagId })
      .onConflictDoNothing();
    return data({ success: true });
  }

  if (intent === "remove-tag-item") {
    if (!tagId) return data({ error: "tagId is required" }, { status: 400 });
    await db
      .delete(changelogTagItems)
      .where(
        and(eq(changelogTagItems.changelogId, changelogId), eq(changelogTagItems.tagId, tagId)),
      );
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
