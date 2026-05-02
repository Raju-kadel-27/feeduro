import { requireOrganization } from "@lib/session.server";
import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { changelogs, member } from "@/db/schema";
import type { Route } from "./+types/changelogs";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

async function requireAdmin(organizationId: string, userId: string) {
  const db = getDb();
  const rec = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
  });
  return rec?.role === "admin";
}

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);
  const db = getDb();

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (id) {
    const entry = await db.query.changelogs.findFirst({
      where: and(eq(changelogs.id, id), eq(changelogs.organizationId, organizationId)),
    });
    if (!entry) return data({ error: "Not found" }, { status: 404 });
    return data({ changelog: entry });
  }

  const entries = await db.query.changelogs.findMany({
    where: eq(changelogs.organizationId, organizationId),
    orderBy: [desc(changelogs.createdAt)],
    columns: {
      id: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return data({ changelogs: entries });
}

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);
  const db = getDb();

  const isAdmin = await requireAdmin(organizationId, session.user.id);
  if (!isAdmin) {
    return data({ error: "Only admins can manage changelogs" }, { status: 403 });
  }

  const body = (await request.json()) as { intent: string; [key: string]: unknown };

  if (body.intent === "create") {
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
      .returning({ id: changelogs.id });

    return data({ success: true, id: entry.id });
  }

  if (body.intent === "update") {
    const id = body.id as string;
    const title = (body.title as string)?.trim();
    const changelogBody = body.body as string;

    if (!title) return data({ error: "Title is required" }, { status: 400 });
    if (!id) return data({ error: "ID is required" }, { status: 400 });

    await db
      .update(changelogs)
      .set({ title, body: changelogBody })
      .where(and(eq(changelogs.id, id), eq(changelogs.organizationId, organizationId)));

    return data({ success: true });
  }

  if (body.intent === "publish") {
    const id = body.id as string;
    if (!id) return data({ error: "ID is required" }, { status: 400 });

    await db
      .update(changelogs)
      .set({ status: "published", publishedAt: new Date() })
      .where(and(eq(changelogs.id, id), eq(changelogs.organizationId, organizationId)));

    return data({ success: true });
  }

  if (body.intent === "unpublish") {
    const id = body.id as string;
    if (!id) return data({ error: "ID is required" }, { status: 400 });

    await db
      .update(changelogs)
      .set({ status: "draft", publishedAt: null })
      .where(and(eq(changelogs.id, id), eq(changelogs.organizationId, organizationId)));

    return data({ success: true });
  }

  if (body.intent === "delete") {
    const id = body.id as string;
    if (!id) return data({ error: "ID is required" }, { status: 400 });

    await db
      .delete(changelogs)
      .where(and(eq(changelogs.id, id), eq(changelogs.organizationId, organizationId)));

    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
