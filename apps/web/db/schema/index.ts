import { githubIntegrations } from "@/db/schema";

// subscription is excluded from better-auth re-exports — we maintain our own
// version in app.ts that includes custom Dodo Payments columns.
// githubIntegrations is a custom app table exported via app.ts wildcard.

export * from "./app";
export {
  account,
  apikey,
  invitation,
  member,
  organization,
  organizationRole,
  passkey,
  session,
  ssoProvider,
  twoFactor,
  user,
  verification,
} from "./better-auth";
