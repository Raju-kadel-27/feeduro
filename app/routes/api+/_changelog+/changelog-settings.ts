import { requireOrganization } from "@features/auth/server/guards";
import { DEFAULT_TAGS, parseChangelogSettings } from "@features/changelog/server/changelog-settings";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { changelogTags, organization } from "@/db/schema";
import type { Route } from "./+types/changelog-settings";

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);
  const db = getDb();

  const [org, tags] = await Promise.all([
    db.query.organization.findFirst({ where: eq(organization.id, organizationId) }),
    db.query.changelogTags.findMany({
      where: eq(changelogTags.organizationId, organizationId),
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    }),
  ]);

  // Seed default tags on first visit
  if (tags.length === 0) {
    await db.insert(changelogTags).values(DEFAULT_TAGS.map((name) => ({ organizationId, name })));
    const seeded = await db.query.changelogTags.findMany({
      where: eq(changelogTags.organizationId, organizationId),
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });
    return data({ ...parseChangelogSettings(org?.metadata ?? null), tags: seeded });
  }

  return data({ ...parseChangelogSettings(org?.metadata ?? null), tags });
}

export async function action({ request }: Route.ActionArgs) {
  const { organizationId } = await requireOrganization(request);
  const db = getDb();

  const body = (await request.json()) as { intent: string; [key: string]: unknown };

  if (body.intent === "toggle") {
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
    });
    if (!org) return data({ error: "Not found" }, { status: 404 });

    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(org.metadata ?? "{}") as Record<string, unknown>;
    } catch {}

    await db
      .update(organization)
      .set({ metadata: JSON.stringify({ ...meta, changelogSettings: { enabled: body.enabled } }) })
      .where(eq(organization.id, organizationId));

    return data({ success: true });
  }

  if (body.intent === "create-tag") {
    const name = (body.name as string)?.trim().toLowerCase();
    if (!name) return data({ error: "Name is required" }, { status: 400 });
    if (name.length > 100) return data({ error: "Name too long" }, { status: 400 });

    const existing = await db.query.changelogTags.findFirst({
      where: and(eq(changelogTags.organizationId, organizationId), eq(changelogTags.name, name)),
    });
    if (existing) return data({ error: "Tag already exists" }, { status: 409 });

    const id = createId();
    await db.insert(changelogTags).values({ id, organizationId, name });

    return data({ success: true, id });
  }

  if (body.intent === "delete-tag") {
    const id = body.id as string;
    if (!id) return data({ error: "ID is required" }, { status: 400 });

    await db
      .delete(changelogTags)
      .where(and(eq(changelogTags.id, id), eq(changelogTags.organizationId, organizationId)));

    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
