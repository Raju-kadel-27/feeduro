import type { OAuthConfig, TokenResponse } from "./schemas";

export function buildAuthUrl(
  config: OAuthConfig,
  clientId: string,
  redirectUri: string,
  state: string,
): string {
  const params: Record<string, string> = {
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  };
  if (config.scopes) params.scope = config.scopes;
  if (config.extraAuthParams) Object.assign(params, config.extraAuthParams);
  return `${config.authorizeUrl}?${new URLSearchParams(params)}`;
}

function buildBody(
  params: Record<string, string>,
  format: OAuthConfig["bodyFormat"],
): { body: string; contentType: string } {
  if (format === "form") {
    return {
      body: new URLSearchParams(params).toString(),
      contentType: "application/x-www-form-urlencoded",
    };
  }
  return {
    body: JSON.stringify(params),
    contentType: "application/json",
  };
}

async function parseTokenResponse(res: Response): Promise<TokenResponse> {
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok || json.error) {
    const message = String(json.error_description ?? json.error ?? `OAuth request failed: ${res.status}`);
    throw new Error(message);
  }
  const accessToken = String(json.access_token ?? "");
  if (!accessToken) throw new Error("OAuth response missing access_token");
  return {
    accessToken,
    refreshToken: json.refresh_token ? String(json.refresh_token) : undefined,
    expiresIn: typeof json.expires_in === "number" ? json.expires_in : undefined,
  };
}

export async function exchangeCode(
  config: OAuthConfig,
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const { body, contentType } = buildBody(
    { grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri },
    config.bodyFormat,
  );
  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": contentType, Accept: "application/json" },
    body,
  });
  return parseTokenResponse(res);
}

export async function refreshAccessToken(
  config: OAuthConfig,
  token: string,
  clientId: string,
  clientSecret: string,
): Promise<TokenResponse> {
  const { body, contentType } = buildBody(
    { grant_type: "refresh_token", client_id: clientId, client_secret: clientSecret, refresh_token: token },
    config.bodyFormat,
  );
  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": contentType, Accept: "application/json" },
    body,
  });
  return parseTokenResponse(res);
}
