import { createContext, type RouterContextProvider } from "react-router";
import type { Db } from "@/db";

export const CloudflareContext = createContext<{
  env: Cloudflare.Env;
  ctx: ExecutionContext;
  cf?: RequestInitCfProperties;
  db: Db;
}>();

export function getDb(context: Readonly<RouterContextProvider>): Db {
  return context.get(CloudflareContext).db;
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
