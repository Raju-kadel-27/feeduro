import type { OAuthConfig } from "@services/oauth/schemas";

export function zendeskOAuth(subdomain: string): OAuthConfig {
  return {
    authorizeUrl: `https://${subdomain}.zendesk.com/oauth/authorizations/new`,
    tokenUrl: `https://${subdomain}.zendesk.com/oauth/tokens`,
    scopes: "read write",
    bodyFormat: "json",
  };
}
