import { createRequestHandler, RouterContextProvider } from "react-router";
import { createDb } from "@/db";
import { CloudflareContext } from "./middleware/cloudflare.server";

const handler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
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
    // cf.colo = where the request ENTERED Cloudflare (closest to the user).
    // cf-placement response header = where Smart Placement actually EXECUTED the Worker.
    // We log both so they can be compared in the dashboard.
    const ingressColo = request.cf?.colo ?? "unknown";
    const dbMode = env.DATABASE_URL?.includes(".neon.tech") ? "http" : "hyperdrive";

    const withTimings = (response: Response): Response => {
      const dur = Math.round(performance.now() - started);
      const headers = new Headers(response.headers);
      const placementColo = response.headers.get("cf-placement") ?? "unknown";
      headers.set("Server-Timing", `app;dur=${dur};desc="exec=${placementColo}"`);
      console.log(
        `[perf] ${request.method} ${new URL(request.url).pathname} ingress=${ingressColo} placement=${placementColo} db=${dbMode} dur=${dur}ms status=${response.status}`,
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
