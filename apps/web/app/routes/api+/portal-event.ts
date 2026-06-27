import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { data } from "react-router";
import { z } from "zod";
import { getDb } from "@/db";
import { changelogs, organization, portalEvents } from "@/db/schema";

const EVENT_TYPES = ["board_view", "roadmap_view", "updates_view", "changelog_view"] as const;

const BodySchema = z.object({
  orgId: z.string().min(1),
  type: z.enum(EVENT_TYPES),
  resourceId: z.string().optional(),
});

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return data({ error: "Invalid request" }, { status: 400 });

  const { orgId, type, resourceId } = body.data;
  const db = getDb();

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, orgId),
    columns: { id: true },
  });
  if (!org) return data({ ok: false });

  // For changelog_view, validate the entry exists and is published
  if (type === "changelog_view") {
    if (!resourceId) return data({ error: "resourceId required for changelog_view" }, { status: 400 });
    const entry = await db.query.changelogs.findFirst({
      where: eq(changelogs.id, resourceId),
      columns: { id: true, status: true },
    });
    if (!entry || entry.status !== "published") return data({ ok: false });
  }

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const ua = request.headers.get("user-agent") ?? "";

  const visitorHash = createHash("sha256")
    .update(`${ip}:${ua}:${orgId}`)
    .digest("hex")
    .slice(0, 64);

  await db.insert(portalEvents).values({
    organizationId: orgId,
    visitorHash,
    type,
    resourceId: resourceId ?? null,
  });

  return data({ ok: true });
}
