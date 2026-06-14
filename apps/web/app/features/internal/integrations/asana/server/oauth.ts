import type { OAuthConfig } from "@services/oauth/schemas";

export const asanaOAuth = {
  authorizeUrl: "https://app.asana.com/-/oauth_authorize",
  tokenUrl: "https://app.asana.com/-/oauth_token",
  bodyFormat: "form",
} satisfies OAuthConfig;
