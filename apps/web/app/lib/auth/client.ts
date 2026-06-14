import { apiKeyClient } from "@better-auth/api-key/client";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { passkey } from "@better-auth/passkey";
import { passkeyClient } from "@better-auth/passkey/client";
import { ssoClient } from "@better-auth/sso/client";
import { dodopaymentsClient } from "@dodopayments/better-auth";
import {
  adminClient,
  genericOAuthClient,
  lastLoginMethodClient,
  organizationClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, adminRole, memberRole, viewerRole } from "@/app/lib/auth/server/permissions";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
  plugins: [
    adminClient(),
    lastLoginMethodClient(),
    organizationClient({
      ac,
      roles: { admin: adminRole, member: memberRole, viewer: viewerRole },
      dynamicAccessControl: { enabled: true },
    }),
    ssoClient(),
    apiKeyClient(),
    dodopaymentsClient(),
    genericOAuthClient(),
    passkeyClient(),
    twoFactorClient(),
    oauthProviderClient(),
  ],
});

export type AuthClient = typeof authClient;
