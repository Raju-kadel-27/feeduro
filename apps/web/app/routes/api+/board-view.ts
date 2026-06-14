import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { data } from "react-router";
import { z } from "zod";
import { getDb } from "@/db";
import { boardViews, organization } from "@/db/schema";

const BodySchema = z.object({ orgId: z.string().min(1) });

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return data({ error: "Invalid request" }, { status: 400 });

  const { orgId } = body.data;
  const db = getDb();

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, orgId),
    columns: { id: true },
  });
  if (!org) return data({ ok: false });

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const ua = request.headers.get("user-agent") ?? "";

  // Include orgId in the hash so the same visitor across orgs produces distinct hashes
  const visitorHash = createHash("sha256")
    .update(`${ip}:${ua}:${orgId}`)
    .digest("hex")
    .slice(0, 64);

  await db.insert(boardViews).values({ organizationId: orgId, visitorHash });

  return data({ ok: true });
}
