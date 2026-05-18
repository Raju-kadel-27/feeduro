import { z } from "zod";

export const OAuthConfigSchema = z.object({
  authorizeUrl: z.string(),
  tokenUrl: z.string(),
  // Omit for providers that don't use scopes (e.g. Asana)
  scopes: z.string().optional(),
  // How to encode the POST body to the token endpoint
  bodyFormat: z.enum(["json", "form"]),
  // Provider-specific extra params appended to the authorize URL (e.g. Jira needs audience + prompt)
  extraAuthParams: z.record(z.string(), z.string()).optional(),
});

export const TokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresIn: z.number().optional(),
});

export type OAuthConfig = z.infer<typeof OAuthConfigSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
