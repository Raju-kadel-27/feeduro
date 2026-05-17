import type { OAuthConfig } from "@services/oauth/schemas";

export const jiraOAuth = {
  authorizeUrl: "https://auth.atlassian.com/authorize",
  tokenUrl: "https://auth.atlassian.com/oauth/token",
  scopes: "read:jira-work write:jira-work manage:jira-project offline_access",
  bodyFormat: "json",
  extraAuthParams: { audience: "api.atlassian.com", prompt: "consent" },
} satisfies OAuthConfig;
