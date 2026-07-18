import { createContext, type RouterContextProvider } from "react-router";
import type { Db } from "@/db";

export const CloudflareContext = createContext<{
  env: Cloudflare.Env;
  ctx: ExecutionContext;
  cf?: RequestInitCfProperties;
  db: Db;
}>();

// Threads KV + ExecutionContext into guards without changing any call site.
// Populated by getDb() so it's always set before requireOrgBySlug() is called.
type RequestContext = { kv?: KVNamespace; ctx: ExecutionContext };
const requestContextByDb = new WeakMap<Db, RequestContext>();

export function getDb(context: Readonly<RouterContextProvider>): Db {
  const { db, env, ctx } = context.get(CloudflareContext);
  if (!requestContextByDb.has(db)) {
    requestContextByDb.set(db, { kv: env.ORG_CACHE, ctx });
  }
  return db;
}

export function getRequestContext(db: Db): RequestContext | undefined {
  return requestContextByDb.get(db);
}

export function getBindings(context: Readonly<RouterContextProvider>) {
  return context.get(CloudflareContext).env;
}

export function getExecutionContext(context: Readonly<RouterContextProvider>): ExecutionContext {
  return context.get(CloudflareContext).ctx;
}

export function getRequestProperties(
  context: Readonly<RouterContextProvider>,
): RequestInitCfProperties | undefined {
  return context.get(CloudflareContext).cf;
}

export function waitUntil<T>(context: Readonly<RouterContextProvider>, promise: Promise<T>) {
  try {
    const cfCtx = context.get(CloudflareContext);
    if (cfCtx?.ctx) {
      cfCtx.ctx.waitUntil(promise);
    }
  } catch {
    // CloudflareContext not set — running outside Cloudflare Workers (e.g. local dev)
  }
  return promise;
}
