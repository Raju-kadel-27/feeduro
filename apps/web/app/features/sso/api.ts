import { z } from "zod";

const SSOApiResponseSchema = z.object({
  error: z.string().optional(),
  success: z.boolean().optional(),
});

export async function callSSOApi(body: object): Promise<void> {
  const res = await fetch("/api/sso", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = SSOApiResponseSchema.safeParse(await res.json());
  if (!res.ok) {
    throw new Error(parsed.data?.error ?? "Request failed");
  }
}
