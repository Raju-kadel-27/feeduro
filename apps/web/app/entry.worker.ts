import { createRequestHandler, RouterContextProvider } from "react-router";
import { withRequestDb } from "@/db";
import { CloudflareContext } from "./middleware/cloudflare.server";

const handler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

const RESERVED_SUBDOMAINS = new Set(["www", "app", "api", "mail", "admin"]);
const APP_DOMAIN = "feeduro.com";

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    return withRequestDb(
      (cleanup) => ctx.waitUntil(cleanup),
      async () => {
        const url = new URL(request.url);
        const hostname = url.hostname;

        if (hostname.endsWith(`.${APP_DOMAIN}`)) {
          const orgSlug = hostname.slice(0, -`.${APP_DOMAIN}`.length);
          if (orgSlug && !RESERVED_SUBDOMAINS.has(orgSlug)) {
            const rewritten = new URL(`/${orgSlug}${url.pathname}`, url);
            rewritten.search = url.search;
            const context = new RouterContextProvider();
            context.set(CloudflareContext, { env, ctx, cf: request.cf });
            return await handler(new Request(rewritten.toString(), request), context);
          }
        }

        const context = new RouterContextProvider();
        context.set(CloudflareContext, { env, ctx, cf: request.cf });
        return await handler(request, context);
      },
    );
  },
};
