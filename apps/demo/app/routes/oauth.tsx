import { redirect } from "react-router";
import type { Route } from "./+types/oauth";
import { getEnv } from "@lib/env.server";
import { getActiveApiUrl } from "@lib/env-override.server";

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)).buffer as ArrayBuffer);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: b64url(digest) };
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

interface TokenSession {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  obtained_at: number;
}

function readTokenSession(request: Request): TokenSession | null {
  const raw = getCookie(request, "oauth_tokens");
  if (!raw) return null;
  try {
    return JSON.parse(atob(raw)) as TokenSession;
  } catch {
    return null;
  }
}

function makeTokenCookie(tokens: TokenSession): string {
  return `oauth_tokens=${encodeURIComponent(btoa(JSON.stringify(tokens)))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`;
}

function clearCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

const SCOPES = "openid profile email offline_access";

// ── Route exports ─────────────────────────────────────────────────────────────

export function meta(): Route.MetaDescriptors {
  return [{ title: "OAuth Test · Feeduro Demo" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnv(context);
  const baseUrl = getActiveApiUrl(request, env);
  const tokens = readTokenSession(request);
  const error = new URL(request.url).searchParams.get("error");

  let userInfo: Record<string, unknown> | null = null;
  if (tokens) {
    try {
      const res = await fetch(`${baseUrl}/api/auth/oauth2/userinfo`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (res.ok) userInfo = (await res.json()) as Record<string, unknown>;
    } catch {
      // non-fatal — still show token info
    }
  }

  return {
    baseUrl,
    clientId: env.FEEDURO_OAUTH_CLIENT_ID,
    redirectUri: env.FEEDURO_OAUTH_REDIRECT_URI,
    configured: Boolean(env.FEEDURO_OAUTH_CLIENT_ID),
    tokens,
    userInfo,
    error,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = getEnv(context);
  const baseUrl = getActiveApiUrl(request, env);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "connect") {
    const { verifier, challenge } = await generatePKCE();
    const state = b64url(crypto.getRandomValues(new Uint8Array(16)).buffer as ArrayBuffer);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: env.FEEDURO_OAUTH_CLIENT_ID,
      redirect_uri: env.FEEDURO_OAUTH_REDIRECT_URI,
      scope: SCOPES,
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
    });

    return redirect(`${baseUrl}/api/auth/oauth2/authorize?${params}`, {
      headers: [
        ["Set-Cookie", `oauth_pkce_verifier=${encodeURIComponent(verifier)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`],
        ["Set-Cookie", `oauth_state=${encodeURIComponent(state)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`],
      ],
    });
  }

  if (intent === "logout") {
    return redirect("/oauth", {
      headers: [
        ["Set-Cookie", clearCookie("oauth_tokens")],
        ["Set-Cookie", clearCookie("oauth_pkce_verifier")],
        ["Set-Cookie", clearCookie("oauth_state")],
      ],
    });
  }

  if (intent === "refresh") {
    const tokens = readTokenSession(request);
    if (!tokens?.refresh_token) {
      return redirect("/oauth", { headers: { "Set-Cookie": clearCookie("oauth_tokens") } });
    }

    const basicAuth = btoa(`${env.FEEDURO_OAUTH_CLIENT_ID}:${env.FEEDURO_OAUTH_CLIENT_SECRET}`);

    const res = await fetch(`${baseUrl}/api/auth/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
        client_id: env.FEEDURO_OAUTH_CLIENT_ID,
        client_secret: env.FEEDURO_OAUTH_CLIENT_SECRET,
      }),
    });

    if (!res.ok) {
      return redirect("/oauth?error=refresh_failed", {
        headers: { "Set-Cookie": clearCookie("oauth_tokens") },
      });
    }

    const refreshed = (await res.json()) as Omit<TokenSession, "obtained_at">;
    const newSession: TokenSession = { ...refreshed, obtained_at: Date.now() };
    return redirect("/oauth", { headers: { "Set-Cookie": makeTokenCookie(newSession) } });
  }

  return redirect("/oauth");
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      {children}
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-sm break-all ${mono ? "font-mono text-indigo-700" : "text-gray-700"}`}>{value}</span>
    </div>
  );
}

function TokenRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-gray-400">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
        <code className="flex-1 truncate font-mono text-xs text-gray-600" title={value}>
          {value.slice(0, 32)}…
        </code>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(value)}
          className="shrink-0 rounded text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Copy
        </button>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OAuthTest({ loaderData }: Route.ComponentProps) {
  const { baseUrl, clientId, redirectUri, configured, tokens, userInfo, error } = loaderData;
  const connected = Boolean(tokens);
  const expiresAt = tokens
    ? new Date((tokens.obtained_at ?? 0) + (tokens.expires_in ?? 3600) * 1000)
    : null;
  const expired = expiresAt ? expiresAt < new Date() : false;

  const statusLabel = !configured
    ? "Not configured"
    : connected
      ? expired
        ? "Token expired"
        : "Connected"
      : "Disconnected";

  const statusColor = !configured
    ? "bg-amber-50 text-amber-700"
    : connected
      ? expired
        ? "bg-red-50 text-red-700"
        : "bg-emerald-50 text-emerald-700"
      : "bg-gray-100 text-gray-500";

  const dotColor = !configured
    ? "bg-amber-400"
    : connected
      ? expired
        ? "bg-red-400"
        : "bg-emerald-400"
      : "bg-gray-400";

  return (
    <>
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">OAuth 2.1 Integration</h1>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
            {statusLabel}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          PKCE Authorization Code flow →{" "}
          <span className="font-mono text-xs">{baseUrl}/api/auth/oauth2</span>
        </p>
      </div>

      <div className="space-y-4 p-8">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-sm font-medium text-red-700">OAuth error</p>
            <p className="mt-0.5 font-mono text-xs text-red-600">{decodeURIComponent(error)}</p>
          </div>
        )}

        {!configured && (
          <Section label="Setup Required">
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Create an OAuth client in your Feeduro workspace under{" "}
                <strong>Settings → API → OAuth Clients</strong>, then add these to{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">apps/demo/.dev.vars</code>:
              </p>
              <div className="space-y-1 rounded-lg bg-gray-900 px-4 py-3 font-mono text-xs text-emerald-300">
                <div className="text-gray-500"># OAuth integration test</div>
                <div>FEEDURO_OAUTH_CLIENT_ID=your_client_id_here</div>
                <div>FEEDURO_OAUTH_CLIENT_SECRET=your_client_secret_here</div>
                <div className="text-gray-500"># Optional — defaults to http://localhost:3001/oauth/callback</div>
                <div className="text-gray-500"># FEEDURO_OAUTH_REDIRECT_URI=http://localhost:3001/oauth/callback</div>
              </div>
              <p className="text-xs text-gray-500">
                Create an OAuth app in Settings, copy both the client ID and secret from the credentials banner, then set the <strong>Redirect URI</strong> to{" "}
                <code className="rounded bg-gray-100 px-1 font-mono">{redirectUri}</code>.
              </p>
            </div>
          </Section>
        )}

        {configured && !connected && (
          <Section label="Connect">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Client ID" value={clientId} mono />
                <Field label="Redirect URI" value={redirectUri} mono />
                <Field label="Scopes" value={SCOPES} />
                <Field label="Method" value="PKCE (S256) · Authorization Code · Basic auth" />
              </div>
              <form method="post">
                <input type="hidden" name="intent" value="connect" />
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  Connect with Feeduro →
                </button>
              </form>
            </div>
          </Section>
        )}

        {connected && tokens && (
          <>
            <Section label="Access Token">
              <div className="space-y-4">
                <TokenRow label="access_token" value={tokens.access_token} />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Token Type" value={tokens.token_type} />
                  <Field label="Scopes" value={tokens.scope ?? SCOPES} />
                  <Field
                    label="Expires"
                    value={
                      expiresAt
                        ? `${expiresAt.toLocaleTimeString()} — ${expired ? "EXPIRED" : "valid"}`
                        : "—"
                    }
                  />
                  <Field label="Has Refresh Token" value={tokens.refresh_token ? "Yes" : "No"} />
                </div>
                <div className="flex gap-2">
                  {tokens.refresh_token && (
                    <form method="post">
                      <input type="hidden" name="intent" value="refresh" />
                      <button
                        type="submit"
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        Refresh Token
                      </button>
                    </form>
                  )}
                  <form method="post">
                    <input type="hidden" name="intent" value="logout" />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                    >
                      Disconnect
                    </button>
                  </form>
                </div>
              </div>
            </Section>

            {tokens.refresh_token && (
              <Section label="Refresh Token">
                <TokenRow label="refresh_token" value={tokens.refresh_token} />
              </Section>
            )}

            <Section label="User Info">
              {userInfo ? (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(userInfo).map(([k, v]) => (
                    <Field
                      key={k}
                      label={k}
                      value={typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}
                      mono={k === "sub" || k.endsWith("_token")}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Could not fetch user info — token may have expired or the userinfo endpoint is
                  unreachable.
                </p>
              )}
            </Section>

            <Section label="Discovery">
              <div className="space-y-2">
                {[
                  ["OpenID Configuration", `${baseUrl}/.well-known/openid-configuration`],
                  ["JWKS", `${baseUrl}/.well-known/jwks.json`],
                  ["Authorization", `${baseUrl}/api/auth/oauth2/authorize`],
                  ["Token", `${baseUrl}/api/auth/oauth2/token`],
                  ["UserInfo", `${baseUrl}/api/auth/oauth2/userinfo`],
                ].map(([label, url]) => (
                  <div key={url} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-xs text-gray-400">{label}</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate font-mono text-xs text-indigo-600 hover:underline"
                    >
                      {url}
                    </a>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </>
  );
}
