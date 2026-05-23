import type { OAuthConfig } from "@services/oauth/schemas";

export const linearOAuth = {
  authorizeUrl: "https://linear.app/oauth/authorize",
  tokenUrl: "https://api.linear.app/oauth/token",
  scopes: "read,write,admin",
  bodyFormat: "form",
} satisfies OAuthConfig;
