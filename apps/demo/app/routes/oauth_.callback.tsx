import { redirect } from "react-router";
import type { Route } from "./+types/oauth_.callback";
import { getEnv } from "@lib/env.server";
import { getActiveApiUrl } from "@lib/env-override.server";

function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    const msg = errorDescription ?? error;
    return redirect(`/oauth?error=${encodeURIComponent(msg)}`);
  }

  if (!code) {
    return redirect("/oauth?error=missing_authorization_code");
  }

  const savedState = getCookie(request, "oauth_state");
  if (state && savedState && state !== savedState) {
    return redirect("/oauth?error=state_mismatch_csrf_check_failed");
  }

  const verifier = getCookie(request, "oauth_pkce_verifier");
  if (!verifier) {
    return redirect("/oauth?error=missing_pkce_verifier_please_restart_flow");
  }

  const env = getEnv(context);
  const baseUrl = getActiveApiUrl(request, env);

  const basicAuth = btoa(`${env.FEEDURO_OAUTH_CLIENT_ID}:${env.FEEDURO_OAUTH_CLIENT_SECRET}`);

  const res = await fetch(`${baseUrl}/api/auth/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.FEEDURO_OAUTH_REDIRECT_URI,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return redirect(`/oauth?error=${encodeURIComponent(`token_exchange_failed: ${body.slice(0, 120)}`)}`);
  }

  const tokens = (await res.json()) as TokenResponse;
  const session = { ...tokens, obtained_at: Date.now() };
  const encoded = encodeURIComponent(btoa(JSON.stringify(session)));

  return redirect("/oauth", {
    headers: [
      ["Set-Cookie", `oauth_tokens=${encoded}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`],
      ["Set-Cookie", "oauth_pkce_verifier=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"],
      ["Set-Cookie", "oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"],
    ],
  });
}
