import { createRequestHandler, RouterContextProvider } from "react-router";
import { createDb } from "@/db";
import { APP_DOMAIN } from "./features/domains/constants";
import { CloudflareContext } from "./middleware/cloudflare.server";

const handler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

// Subdomains that belong to sibling Cloudflare Workers (og-worker, api worker).
// The web worker's wildcard *.feeduro.com route would otherwise catch these and
// render the web app UI — return 404 immediately instead.
const WORKER_SUBDOMAINS = new Set(["og", "og-staging", "api", "api-staging"]);

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const hostname = new URL(request.url).hostname;
    if (hostname.endsWith(`.${APP_DOMAIN}`)) {
      const sub = hostname.slice(0, -(APP_DOMAIN.length + 1));
      if (WORKER_SUBDOMAINS.has(sub)) {
        return new Response("Not Found", { status: 404 });
      }
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
    // cf.colo = where the request entered Cloudflare's network (closest edge to
    // the user). cf-placement is injected by Cloudflare's infrastructure AFTER
    // the Worker returns — it is never readable from inside the Worker. Check it
    // from the client instead: `curl -sI https://feeduro.com | grep cf-placement`
    const ingressColo = request.cf?.colo ?? "unknown";
    const dbMode = env.DATABASE_URL?.includes(".neon.tech") ? "http" : "hyperdrive";

    const withTimings = (response: Response): Response => {
      const dur = Math.round(performance.now() - started);
      const headers = new Headers(response.headers);
      headers.set("Server-Timing", `app;dur=${dur}`);
      console.log(
        JSON.stringify({
          event: "request",
          method: request.method,
          path: new URL(request.url).pathname,
          ingressColo,
          db: dbMode,
          dur,
          status: response.status,
        }),
      );
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
