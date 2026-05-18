import type { OAuthConfig } from "@services/oauth/schemas";

export const githubOAuth = {
  authorizeUrl: "https://github.com/login/oauth/authorize",
  tokenUrl: "https://github.com/login/oauth/access_token",
  scopes: "repo read:user user:email admin:repo_hook",
  bodyFormat: "json",
} satisfies OAuthConfig;
