import type { OAuthConfig } from "@services/oauth/schemas";

export const hubspotOAuth = {
  authorizeUrl: "https://app.hubspot.com/oauth/authorize",
  tokenUrl: "https://api.hubapi.com/oauth/v1/token",
  scopes: "crm.objects.contacts.read crm.objects.deals.write oauth",
  bodyFormat: "form",
} satisfies OAuthConfig;
