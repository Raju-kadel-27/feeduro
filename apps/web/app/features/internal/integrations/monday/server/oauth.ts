import type { OAuthConfig } from "@services/oauth/schemas";

export const mondayOAuth = {
  authorizeUrl: "https://auth.monday.com/oauth2/authorize",
  tokenUrl: "https://auth.monday.com/oauth2/token",
  bodyFormat: "form",
} satisfies OAuthConfig;
