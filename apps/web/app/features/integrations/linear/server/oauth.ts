import type { OAuthConfig } from "@services/oauth/schemas";

export const linearOAuth = {
  authorizeUrl: "https://linear.app/oauth/authorize",
  tokenUrl: "https://api.linear.app/oauth/token",
  scopes: "write",
  bodyFormat: "form",
} satisfies OAuthConfig;
