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
      return await run();
    } finally {
      ctx.waitUntil(close().catch(() => {}));
    }
  },
};
