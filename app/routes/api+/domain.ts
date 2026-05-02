import { requireOrganization } from "@lib/session.server";
import { getBindings } from "@middleware/cloudflare.server";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { customDomains, member } from "@/db/schema";
import type { Route } from "./+types/domain";

const KV_PREFIX = "custom_domain:v1:";

async function purgeKvCache(context: Route.ActionArgs["context"], domain: string) {
  try {
    const env = getBindings(context) as unknown as { CMS_KV?: KVNamespace };
    await env.CMS_KV?.delete(`${KV_PREFIX}${domain}`);
  } catch {
    // Non-fatal: cache will expire on its own after TTL
  }
}

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

async function resolveTxt(hostname: string): Promise<string[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=TXT`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/dns-json" } });
    if (!res.ok) return [];
    const json = (await res.json()) as { Answer?: { data: string }[] };
    return (json.Answer ?? []).map((a) => a.data.replace(/^"|"$/g, ""));
  } catch {
    return [];
  }
}

async function requireAdmin(organizationId: string, userId: string) {
  const db = getDb();
  const memberRecord = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
  });
  return memberRecord?.role === "admin";
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

  const isAdmin = await requireAdmin(organizationId, session.user.id);
  if (!isAdmin) {
    return data({ error: "Only admins can manage custom domains" }, { status: 403 });
  }

  const body = (await request.json()) as { intent: string; domain?: string };

  if (body.intent === "add_domain") {
    const rawDomain = body.domain
      ?.trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    if (!rawDomain || !DOMAIN_RE.test(rawDomain)) {
      return data({ error: "Enter a valid domain (e.g. feedback.company.com)" }, { status: 400 });
    }

    const [existing, taken] = await Promise.all([
      db.query.customDomains.findFirst({
        where: eq(customDomains.organizationId, organizationId),
      }),
      db.query.customDomains.findFirst({
        where: eq(customDomains.domain, rawDomain),
      }),
    ]);

    if (existing) {
      return data({ error: "Remove your current domain before adding a new one" }, { status: 409 });
    }
    if (taken) {
      return data({ error: "This domain is already in use" }, { status: 409 });
    }

    const verificationToken = `feediyo-verify=${createId()}`;
    await db.insert(customDomains).values({
      organizationId,
      domain: rawDomain,
      status: "pending",
      verificationToken,
    });

    const created = await db.query.customDomains.findFirst({
      where: eq(customDomains.organizationId, organizationId),
    });
    return data({ domain: created });
  }

  if (body.intent === "remove_domain") {
    const existing = await db.query.customDomains.findFirst({
      where: eq(customDomains.organizationId, organizationId),
      columns: { domain: true },
    });
    await db.delete(customDomains).where(eq(customDomains.organizationId, organizationId));
    if (existing) await purgeKvCache(context, existing.domain);
    return data({ success: true });
  }

  if (body.intent === "verify_domain") {
    const record = await db.query.customDomains.findFirst({
      where: eq(customDomains.organizationId, organizationId),
    });
    if (!record) {
      return data({ error: "No domain configured" }, { status: 404 });
    }

    const txtRecords = await resolveTxt(`_feediyo.${record.domain}`);
    const verified = txtRecords.some((r) => r === record.verificationToken);

    if (verified) {
      await db
        .update(customDomains)
        .set({ status: "active", verifiedAt: new Date() })
        .where(eq(customDomains.organizationId, organizationId));
      // Purge stale "not found" cache entry so routing picks up the new active domain immediately
      await purgeKvCache(context, record.domain);
      return data({ verified: true });
    }

    await db
      .update(customDomains)
      .set({ status: "failed" })
      .where(eq(customDomains.organizationId, organizationId));
    return data({
      verified: false,
      error: "TXT record not found — DNS changes can take up to 48 hours to propagate",
    });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
