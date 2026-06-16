import { requireOrganization } from "@features/auth/server/guards";
import { data } from "react-router";
import { z } from "zod";
import { auth } from "@/app/lib/auth/server";

import type { Route } from "./+types/oauth-clients";

const CreateClientSchema = z.object({
  intent: z.literal("create"),
  name: z.string().min(1).max(64),
  redirectUris: z.string().min(1),
  isPublic: z.enum(["true", "false"]).transform((v) => v === "true"),
});

const DeleteClientSchema = z.object({
  intent: z.literal("delete"),
  clientId: z.string().min(1),
});

const RotateSecretSchema = z.object({
  intent: z.literal("rotate"),
  clientId: z.string().min(1),
});

export async function action({ request }: Route.ActionArgs) {
  await requireOrganization(request);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return data({ error: "Invalid JSON body" }, { status: 400 });
  }

  const discriminator = z.object({ intent: z.string() }).safeParse(raw);
  if (!discriminator.success) return data({ error: "Invalid request" }, { status: 400 });

  const { intent } = discriminator.data;

  if (intent === "create") {
    const parsed = CreateClientSchema.safeParse(raw);
    if (!parsed.success)
      return data({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

    const { name, redirectUris, isPublic } = parsed.data;
    const uris = redirectUris.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean);
    if (uris.length === 0)
      return data({ error: "At least one redirect URI is required" }, { status: 400 });

    try {
      const result = await auth.api.createOAuthClient({
        headers: request.headers,
        body: {
          client_name: name,
          redirect_uris: uris,
          token_endpoint_auth_method: isPublic ? "none" : "client_secret_basic",
        },
      });
      return data({ created: result ?? null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create OAuth app";
      return data({ error: msg }, { status: 400 });
    }
  }

  if (intent === "delete") {
    const parsed = DeleteClientSchema.safeParse(raw);
    if (!parsed.success) return data({ error: "Invalid input" }, { status: 400 });
    try {
      await auth.api.deleteOAuthClient({
        headers: request.headers,
        body: { client_id: parsed.data.clientId },
      });
      return data({ deleted: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete OAuth app";
      return data({ error: msg }, { status: 400 });
    }
  }

  if (intent === "rotate") {
    const parsed = RotateSecretSchema.safeParse(raw);
    if (!parsed.success) return data({ error: "Invalid input" }, { status: 400 });
    try {
      const result = await auth.api.rotateClientSecret({
        headers: request.headers,
        body: { client_id: parsed.data.clientId },
      });
      return data({ secret: (result as { client_secret?: string } | null)?.client_secret ?? null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to rotate secret";
      return data({ error: msg }, { status: 400 });
    }
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
