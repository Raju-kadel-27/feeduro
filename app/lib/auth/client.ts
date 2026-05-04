import { apiKeyClient } from "@better-auth/api-key/client";
import { ssoClient } from "@better-auth/sso/client";
import { stripeClient } from "@better-auth/stripe/client";
import { dodopaymentsClient } from "@dodopayments/better-auth";
import { genericOAuthClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [
    organizationClient(),
    ssoClient(),
    apiKeyClient(),
    stripeClient({ subscription: true }),
    dodopaymentsClient(),
    genericOAuthClient(),
  ],
});

export type AuthClient = typeof authClient;
