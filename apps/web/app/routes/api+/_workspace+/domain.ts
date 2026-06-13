import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import { getBindings } from "@middleware/cloudflare.server";
import { eq } from "drizzle-orm";
import { data } from "react-router";
import { z } from "zod";
import { getDb } from "@/db";
import { customDomains } from "@/db/schema";

import type { Route } from "./+types/domain";

const KV_PREFIX = "custom_domain:v1:";

const bodySchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("add_domain"), domain: z.string().min(1) }),
  z.object({ intent: z.literal("remove_domain") }),
  z.object({ intent: z.literal("verify_domain"), auto: z.boolean().optional() }),
]);

async function purgeKvCache(context: Route.ActionArgs["context"], domain: string) {
  try {
    const env = getBindings(context) as unknown as { CMS_KV?: KVNamespace };
    await env.CMS_KV?.delete(`${KV_PREFIX}${domain}`);
  } catch {
    // Non-fatal: cache will expire on its own after TTL
  }
}

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

async function resolveCname(hostname: string): Promise<string | null> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=CNAME`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/dns-json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as { Answer?: { data: string }[] };
    const answer = json.Answer?.[0];
    return answer ? answer.data.replace(/\.$/, "").toLowerCase() : null;
  } catch {
    return null;
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);
  const db = getDb();
  const domain = await db.query.customDomains.findFirst({
    where: eq(customDomains.organizationId, organizationId),
  });
  return data({ domain: domain ?? null });
}

export async function action({ request, context }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);
  const db = getDb();

  await requirePermission(organizationId, session.user.id, { settings: ["update"] });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return data({ error: "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;

  if (body.intent === "add_domain") {
    const rawDomain = body.domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    if (!DOMAIN_RE.test(rawDomain)) {
      return data({ error: "Enter a valid domain (e.g. feedback.company.com)" }, { status: 400 });
    }

    const [existing, taken] = await Promise.all([
      db.query.customDomains.findFirst({
        where: eq(customDomains.organizationId, organizationId),
        columns: { id: true },
      }),
      db.query.customDomains.findFirst({
        where: eq(customDomains.domain, rawDomain),
        columns: { id: true },
      }),
    ]);

    if (existing) {
      return data({ error: "Remove your current domain before adding a new one" }, { status: 409 });
    }
    if (taken) {
      return data({ error: "This domain is already in use" }, { status: 409 });
    }

    await purgeKvCache(context, rawDomain);
    const [created] = await db
      .insert(customDomains)
      .values({ organizationId, domain: rawDomain, status: "pending" })
      .returning();
    return data({ domain: created });
  }

  if (body.intent === "remove_domain") {
    const existing = await db.query.customDomains.findFirst({
      where: eq(customDomains.organizationId, organizationId),
      columns: { domain: true },
    });
    if (!existing) return data({ error: "No domain configured" }, { status: 404 });
    await db.delete(customDomains).where(eq(customDomains.organizationId, organizationId));
    await purgeKvCache(context, existing.domain);
    return data({ success: true });
  }

  if (body.intent === "verify_domain") {
    const record = await db.query.customDomains.findFirst({
      where: eq(customDomains.organizationId, organizationId),
      columns: { domain: true, status: true },
    });
    if (!record) {
      return data({ error: "No domain configured" }, { status: 404 });
    }
    if (record.status === "active") {
      return data({ verified: true });
    }

    const cname = await resolveCname(record.domain);
    const verified = cname === "cname.feeduro.com";

    if (verified) {
      await db
        .update(customDomains)
        .set({ status: "active", verifiedAt: new Date() })
        .where(eq(customDomains.organizationId, organizationId));
      await purgeKvCache(context, record.domain);
      return data({ verified: true });
    }

    // Auto-poll silently leaves status as pending — only an explicit user verify writes "failed"
    if (!body.auto) {
      await db
        .update(customDomains)
        .set({ status: "failed" })
        .where(eq(customDomains.organizationId, organizationId));
    }
    return data({
      verified: false,
      error: "CNAME record not found — DNS changes can take up to 48 hours to propagate",
    });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
