import { createRequestHandler, RouterContextProvider } from "react-router";
import { createDb } from "@/db";
import { APP_DOMAIN, RESERVED_SUBDOMAINS } from "./features/domains/constants";
import { CloudflareContext } from "./middleware/cloudflare.server";

// TODO: remove once @better-auth/sso ships the redirect:"manual" fix (tracked in
// https://github.com/better-auth/better-auth/issues/10052). The SSO plugin calls
// fetch() with redirect:"error" during OIDC discovery which Cloudflare Workers
// reject. Convert to redirect:"manual" and throw on 3xx to preserve the same
// semantics betterFetch expects.
const _nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (init?.redirect === "error") {
    return _nativeFetch(input, { ...init, redirect: "manual" }).then((res) => {
      if (res.status >= 300 && res.status < 400) {
        throw new TypeError(
          `redirect:"error" — unexpected redirect to ${res.headers.get("location")}`,
        );
      }
      return res;
    });
  }
  return _nativeFetch(input, init);
}) as typeof fetch;

const handler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    // Guard: reject reserved subdomains (e.g. api.feeduro.com) that have their
    // own dedicated worker. The wildcard *.feeduro.com/* route would otherwise
    // intercept those requests because Cloudflare Worker Routes beat Custom Domains.
    const hostname = new URL(request.url).hostname;
    const subdomain = hostname.endsWith(`.${APP_DOMAIN}`)
      ? hostname.slice(0, -(APP_DOMAIN.length + 1))
      : null;
    if (subdomain && RESERVED_SUBDOMAINS.has(subdomain)) {
      return new Response("Not Found", { status: 404 });
    }

    if (!env.HYPERDRIVE) {
      throw new Error(
        "HYPERDRIVE binding is missing — check the hyperdrive entry for this environment in wrangler.jsonc",
      );
    }

    // DATABASE_URL (direct Neon URL) enables the HTTP read path; without it
    // everything runs over postgres.js + Hyperdrive. See db/index.ts.
    const { db, close } = createDb(env.HYPERDRIVE.connectionString, env.DATABASE_URL);

    const run = async (): Promise<Response> => {
      const context = new RouterContextProvider();
      context.set(CloudflareContext, { env, ctx, cf: request.cf, db });
      return await handler(request, context);
    };

    const started = performance.now();

    const withTimings = (response: Response): Response => {
      const dur = Math.round(performance.now() - started);
      const headers = new Headers(response.headers);
      headers.set("Server-Timing", `app;dur=${dur}`);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    };

    try {
      const response = withTimings(await run());

      // Delay DB close until the response body is fully streamed. Without this,
      // sql.end() races against deferred loader promises that still need DB
      // access after the initial Response object is returned (e.g. analytics
      // fetchAll's 20 queries start inside a .then() chain AFTER handler returns).
      if (response.body) {
        const { readable, writable } = new TransformStream();
        ctx.waitUntil(response.body.pipeTo(writable).finally(() => close().catch(() => {})));
        return new Response(readable, { status: response.status, headers: response.headers });
      }

      ctx.waitUntil(close().catch(() => {}));
      return response;
    } catch (e) {
      ctx.waitUntil(close().catch(() => {}));
      throw e;
    }
  },
};
