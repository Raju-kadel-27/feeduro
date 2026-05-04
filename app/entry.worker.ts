import * as build from "virtual:react-router/server-build";
import { and, eq } from "drizzle-orm";
import { createRequestHandler, RouterContextProvider } from "react-router";
import { getDb } from "@/db";
import { customDomains, organization } from "@/db/schema";
import { CloudflareContext } from "./middleware/cloudflare.server";

const handler = createRequestHandler(build, import.meta.env.MODE);

const RESERVED_SUBDOMAINS = new Set(["www", "app", "api", "mail", "admin"]);
const APP_DOMAIN = "feediyo.com";

// KV cache key prefix for custom domain → orgSlug mapping
const KV_PREFIX = "custom_domain:v1:";
// How long a resolved domain is cached in KV (seconds)
const KV_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Resolve a custom hostname to an org slug.
 *
 * Strategy (fastest → slowest):
 *  1. Cloudflare KV  — shared across all Worker instances, survives cold starts
 *  2. Neon DB — single HTTP round-trip via the serverless driver
 *
 * A negative result ("no active domain") is also cached so we don't hammer
 * the DB for every request to an unknown hostname.
 */
async function resolveCustomDomain(hostname: string, kv?: KVNamespace): Promise<string | null> {
  const key = `${KV_PREFIX}${hostname}`;

  // 1. KV cache
  const cached = kv ? await kv.get(key) : null;
  if (cached !== null) {
    // Empty string means "no active domain found" — still a valid cached result
    return cached || null;
  }

  // 2. Database lookup
  try {
    const db = getDb();

    const row = await db
      .select({ slug: organization.slug })
      .from(customDomains)
      .innerJoin(organization, eq(customDomains.organizationId, organization.id))
      .where(and(eq(customDomains.domain, hostname), eq(customDomains.status, "active")))
      .limit(1);

    const orgSlug = row[0]?.slug ?? null;

    // Cache result — empty string encodes a negative (not-found) result
    if (kv) {
      await kv.put(key, orgSlug ?? "", { expirationTtl: KV_TTL_SECONDS });
    }

    return orgSlug;
  } catch (err) {
    // DB unavailable: fail open so the app still loads (just without domain mapping)
    console.error("[custom-domain] DB lookup failed:", err);
    return null;
  }
}

/**
 * Build a rewritten Request with an added `x-custom-domain` header so
 * loaders downstream can know the original public hostname (e.g. for
 * canonical URLs).
 *
 * Workers: `Request.headers` is immutable, so we copy into a new Headers.
 */
function buildRewrittenRequest(
  originalRequest: Request,
  rewrittenUrl: URL,
  customDomain: string,
): Request {
  const headers = new Headers(originalRequest.headers);
  headers.set("x-custom-domain", customDomain);

  const init: RequestInit = { method: originalRequest.method, headers, redirect: "manual" };
  // Body must be omitted for GET / HEAD
  if (originalRequest.method !== "GET" && originalRequest.method !== "HEAD") {
    init.body = originalRequest.body;
  }

  return new Request(rewrittenUrl.toString(), init);
}

function isHtmlRequest(request: Request) {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html");
}

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // ── 1. Feediyo subdomain: {orgSlug}.feediyo.com → /public/{orgSlug} ──────
    if (hostname.endsWith(`.${APP_DOMAIN}`)) {
      const orgSlug = hostname.slice(0, -`.${APP_DOMAIN}`.length);
      if (orgSlug && !RESERVED_SUBDOMAINS.has(orgSlug)) {
        const rewritten = new URL(`/public/${orgSlug}${url.pathname}`, url);
        rewritten.search = url.search;
        const context = new RouterContextProvider();
        context.set(CloudflareContext, { env, ctx, cf: request.cf });
        return await handler(new Request(rewritten.toString(), request), context);
      }
    }

    // ── 2. Custom domain: look up in DB (via KV cache) ───────────────────────
    const isAppDomain = hostname === APP_DOMAIN || hostname.endsWith(`.${APP_DOMAIN}`);
    if (!isAppDomain) {
      const kv = (env as unknown as { CMS_KV?: KVNamespace }).CMS_KV;
      const orgSlug = await resolveCustomDomain(hostname, kv);
      if (orgSlug) {
        const rewritten = new URL(`/public/${orgSlug}${url.pathname}`, url);
        rewritten.search = url.search;
        const context = new RouterContextProvider();
        context.set(CloudflareContext, { env, ctx, cf: request.cf });
        return await handler(buildRewrittenRequest(request, rewritten, hostname), context);
      }

      if (request.method === "GET" || request.method === "HEAD") {
        if (isHtmlRequest(request)) {
          const rewritten = new URL(`/domain-not-configured`, url);
          const context = new RouterContextProvider();
          context.set(CloudflareContext, { env, ctx, cf: request.cf });
          return await handler(buildRewrittenRequest(request, rewritten, hostname), context);
        }

        const assetUrl = new URL(`${url.pathname}${url.search}`, `https://${APP_DOMAIN}`);
        const headers = new Headers(request.headers);
        headers.delete("host");
        return await fetch(new Request(assetUrl.toString(), { method: request.method, headers, redirect: "manual" }));
      }

      return new Response("Domain Not Configured", { status: 404, headers: { "Content-Type": "text/plain;charset=utf-8" } });
    }

    // ── 3. Normal app request ────────────────────────────────────────────────
    const context = new RouterContextProvider();
    context.set(CloudflareContext, { env, ctx, cf: request.cf });
    return await handler(request, context);
  },
};
