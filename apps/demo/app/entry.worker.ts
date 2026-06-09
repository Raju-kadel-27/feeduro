import * as build from "virtual:react-router/server-build";
import { createRequestHandler, RouterContextProvider } from "react-router";
import { CloudflareContext } from "./middleware/cloudflare.server";

const handler = createRequestHandler(build);

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const context = new RouterContextProvider();
    context.set(CloudflareContext, { env, ctx });
    return handler(request, context);
  },
};
