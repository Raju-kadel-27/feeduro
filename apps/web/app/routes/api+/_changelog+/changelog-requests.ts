import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import { searchOrgPostsForPicker } from "@features/changelog/server/changelog-metadata";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { changelogRequests, changelogs, feedbackPosts } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/changelog-requests";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);

  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0") || 0);

  const result = await searchOrgPostsForPicker(db, organizationId, search, offset);
  return data(result);
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);
  await requirePermission(db, organizationId, session.user.id, { changelog: ["update"] });

  const body = (await request.json()) as { intent: string; changelogId?: string; postId?: string };
  const { intent, changelogId, postId } = body;
  if (!changelogId) return data({ error: "changelogId is required" }, { status: 400 });

  const entry = await db.query.changelogs.findFirst({
    where: and(eq(changelogs.id, changelogId), eq(changelogs.organizationId, organizationId)),
    columns: { id: true },
  });
  if (!entry) return data({ error: "Not found" }, { status: 404 });

  if (intent === "add-request") {
    if (!postId) return data({ error: "postId is required" }, { status: 400 });
    const post = await db.query.feedbackPosts.findFirst({
      where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
      columns: { id: true },
    });
    if (!post) return data({ error: "Post not found" }, { status: 404 });
    await db
      .insert(changelogRequests)
      .values({ changelogId, postId, organizationId })
      .onConflictDoNothing();
    return data({ success: true });
  }

  if (intent === "remove-request") {
    if (!postId) return data({ error: "postId is required" }, { status: 400 });
    await db
      .delete(changelogRequests)
      .where(
        and(
          eq(changelogRequests.changelogId, changelogId),
          eq(changelogRequests.postId, postId),
          eq(changelogRequests.organizationId, organizationId),
        ),
      );
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
