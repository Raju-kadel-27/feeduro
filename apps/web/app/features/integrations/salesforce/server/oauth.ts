const SF_AUTH_URL = "https://login.salesforce.com/services/oauth2/authorize";
const SF_TOKEN_URL = "https://login.salesforce.com/services/oauth2/token";

export function salesforceAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "api refresh_token",
    state,
  });
  return `${SF_AUTH_URL}?${params}`;
}

export interface SalesforceTokenResponse {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  id: string;
}

export async function exchangeSalesforceCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<SalesforceTokenResponse> {
  const res = await fetch(SF_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Salesforce token exchange failed: ${res.status}`);
  return res.json() as Promise<SalesforceTokenResponse>;
}
