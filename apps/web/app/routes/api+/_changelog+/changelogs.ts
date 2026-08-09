import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import { listChangelogEntries } from "@features/changelog/server/list-entries";
import { notifyChangelogSubscribers } from "@features/changelog/server/subscribers";
import { extractBlockNoteText } from "@features/feedback/utils";
import { dispatchWebhook } from "@features/internal/webhooks/server/dispatch";
import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq } from "drizzle-orm";
import { data } from "react-router";
import { changelogs } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/changelogs";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);
  const id = new URL(request.url).searchParams.get("id");

  if (id) {
    const entry = await db.query.changelogs.findFirst({
      where: and(eq(changelogs.id, id), eq(changelogs.organizationId, organizationId)),
    });
    if (!entry) return data({ error: "Not found" }, { status: 404 });
    return data({ changelog: entry });
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 100);

  const result = await listChangelogEntries(db, organizationId, { limit, cursor, search });
  return data({ changelogs: result.entries, nextCursor: result.nextCursor, hasMore: result.hasMore });
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, org, organizationId } = await requireOrganization(db, request);

  const body = (await request.json()) as { intent: string; [key: string]: unknown };

  if (body.intent === "create") {
    await requirePermission(db, organizationId, session.user.id, { changelog: ["create"] });

    const title = (body.title as string)?.trim();
    if (!title) return data({ error: "Title is required" }, { status: 400 });

    const baseSlug = slugify(title) || createId().substring(0, 16);
    const existing = await db.query.changelogs.findFirst({
      where: and(eq(changelogs.organizationId, organizationId), eq(changelogs.slug, baseSlug)),
    });
    const slug = existing ? `${baseSlug}-${createId().substring(0, 8)}` : baseSlug;

    const [entry] = await db
      .insert(changelogs)
      .values({
        organizationId,
        title,
        slug,
        body: (body.body as string) ?? "[]",
        status: "draft",
        createdBy: session.user.id,
      })
      .returning({ id: changelogs.id, title: changelogs.title, slug: changelogs.slug, createdAt: changelogs.createdAt });

    dispatchWebhook(context, organizationId, "changelog.created", {
      id: entry.id, title: entry.title, slug: entry.slug, status: "draft",
      createdBy: session.user.id, createdAt: entry.createdAt,
    });
    return data({ success: true, id: entry.id });
  }

  if (body.intent === "update") {
    await requirePermission(db, organizationId, session.user.id, { changelog: ["update"] });

    const id = body.id as string;
    const title = (body.title as string)?.trim();
    const changelogBody = body.body as string;
    if (!title) return data({ error: "Title is required" }, { status: 400 });
    if (!id) return data({ error: "ID is required" }, { status: 400 });

    await db.update(changelogs).set({ title, body: changelogBody })
      .where(and(eq(changelogs.id, id), eq(changelogs.organizationId, organizationId)));
    return data({ success: true });
  }

  if (body.intent === "publish") {
    await requirePermission(db, organizationId, session.user.id, { changelog: ["publish"] });

    const id = body.id as string;
    const shouldNotify = body.notifySubscribers === true;
    if (!id) return data({ error: "ID is required" }, { status: 400 });

    const publishedAt = new Date();

    const [published] = await db
      .update(changelogs)
      .set({ status: "published", publishedAt })
      .where(and(eq(changelogs.id, id), eq(changelogs.organizationId, organizationId)))
      .returning({ title: changelogs.title, slug: changelogs.slug, body: changelogs.body });

    if (published) {
      dispatchWebhook(context, organizationId, "changelog.published", {
        id,
        title: published.title,
        slug: published.slug,
        publishedAt: publishedAt.toISOString(),
        publishedBy: session.user.id,
      });

      if (shouldNotify) {
        const origin = new URL(request.url).origin;
        notifyChangelogSubscribers(context, {
          organizationId,
          orgName: org.name ?? "",
          changelogTitle: published.title,
          excerpt: extractBlockNoteText(published.body, 200),
          changelogUrl: `${origin}/${org.slug}?tab=updates`,
          baseUrl: origin,
        });
      }
    }

    return data({ success: true });
  }

  if (body.intent === "unpublish") {
    await requirePermission(db, organizationId, session.user.id, { changelog: ["update"] });

    const id = body.id as string;
    if (!id) return data({ error: "ID is required" }, { status: 400 });
    await db.update(changelogs).set({ status: "draft", publishedAt: null })
      .where(and(eq(changelogs.id, id), eq(changelogs.organizationId, organizationId)));
    return data({ success: true });
  }

  if (body.intent === "delete") {
    await requirePermission(db, organizationId, session.user.id, { changelog: ["delete"] });

    const id = body.id as string;
    if (!id) return data({ error: "ID is required" }, { status: 400 });
    await db.delete(changelogs)
      .where(and(eq(changelogs.id, id), eq(changelogs.organizationId, organizationId)));
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
