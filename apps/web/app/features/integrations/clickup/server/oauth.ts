import type { OAuthConfig } from "@services/oauth/schemas";

export const clickupOAuth = {
  authorizeUrl: "https://app.clickup.com/api",
  tokenUrl: "https://api.clickup.com/api/v2/oauth/token",
  bodyFormat: "json",
} satisfies OAuthConfig;

// ClickUp token endpoint requires params as query-string on the POST URL (non-standard OAuth2).
export async function exchangeClickupCode(
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const url = new URL("https://api.clickup.com/api/v2/oauth/token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  const json = (await res.json()) as { access_token?: string; err?: string };
  if (!res.ok || json.err) {
    throw new Error(json.err ?? `ClickUp token exchange failed: ${res.status}`);
  }
  if (!json.access_token) throw new Error("ClickUp response missing access_token");
  return json.access_token;
}
