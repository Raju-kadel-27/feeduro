import type { Env } from "./env.server";

export type ActiveEnv = "local" | "staging" | "prod";

export function getActiveEnv(request: Request): ActiveEnv {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/fdy-env=([^;]+)/);
  const val = match?.[1];
  if (val === "staging" || val === "prod") return val;
  return "local";
}

export function getActiveApiUrl(request: Request, env: Env): string {
  const active = getActiveEnv(request);
  if (active === "staging" && env.FEEDURO_STAGING_API_URL) return env.FEEDURO_STAGING_API_URL;
  if (active === "prod" && env.FEEDURO_PROD_API_URL) return env.FEEDURO_PROD_API_URL;
  return env.FEEDURO_API_URL;
}

export function setEnvCookie(env: ActiveEnv): string {
  return `fdy-env=${env}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;
}
