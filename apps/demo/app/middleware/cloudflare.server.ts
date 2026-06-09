import { createContext, type RouterContextProvider } from "react-router";

export const CloudflareContext = createContext<{
  env: Cloudflare.Env;
  ctx: ExecutionContext;
}>();

export function getBindings(context: Readonly<RouterContextProvider>): Cloudflare.Env {
  return context.get(CloudflareContext).env;
}
