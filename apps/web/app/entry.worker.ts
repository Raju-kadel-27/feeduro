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

    const { db, close } = createDb(env.HYPERDRIVE.connectionString);

    const run = async (): Promise<Response> => {
      const context = new RouterContextProvider();
      context.set(CloudflareContext, { env, ctx, cf: request.cf, db });
      return await handler(request, context);
    };

    try {
      const response = await run();

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
