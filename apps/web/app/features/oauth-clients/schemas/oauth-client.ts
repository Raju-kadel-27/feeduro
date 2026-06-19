import { z } from "zod";

export const OAuthClientFormSchema = z.object({
  name: z.string().min(1, "App name is required").max(64, "Max 64 characters"),
  developerName: z.string().max(128, "Max 128 characters"),
  developerUrl: z.string().refine(
    (v) => v === "" || /^https?:\/\//i.test(v),
    "Must be a valid URL starting with http:// or https://",
  ),
  description: z.string().max(512, "Max 512 characters"),
  redirectUris: z.string().min(1, "At least one redirect URI is required"),
});

export type OAuthClientFormData = z.infer<typeof OAuthClientFormSchema>;
