import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { data } from "react-router";
import { z } from "zod";
import { getDb } from "@/db";
import { changelogs, changelogViews } from "@/db/schema";

const BodySchema = z.object({ changelogId: z.string().min(1) });

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return data({ error: "Invalid request" }, { status: 400 });

  const { changelogId } = body.data;

  const db = getDb();
  const changelog = await db.query.changelogs.findFirst({
    where: eq(changelogs.id, changelogId),
    columns: { id: true, organizationId: true, status: true },
  });

  if (!changelog || changelog.status !== "published") {
    return data({ ok: false });
  }

  // Hash IP + User-Agent for anonymous deduplication without storing PII
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const ua = request.headers.get("user-agent") ?? "";
  const visitorHash = createHash("sha256")
    .update(`${ip}:${ua}:${changelogId}`)
    .digest("hex")
    .slice(0, 64);

  await db.insert(changelogViews).values({
    changelogId,
    organizationId: changelog.organizationId,
    visitorHash,
  });

  return data({ ok: true });
}
