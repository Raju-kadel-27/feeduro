import { requireOrganization } from "@features/auth/server/guards";
import { getAuth } from "@lib/auth/server";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { z } from "zod";
import { oauthClient } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/oauth-clients";

const CreateClientSchema = z.object({
  intent: z.literal("create"),
  name: z.string().min(1).max(64),
  redirectUris: z.string().min(1),
  developerName: z.string().max(128).optional(),
  developerUrl: z.string().max(2048).optional(),
  description: z.string().max(512).optional(),
});

const UpdateClientSchema = z.object({
  intent: z.literal("update"),
  clientId: z.string().min(1),
  name: z.string().min(1).max(64),
  redirectUris: z.array(z.string().min(1)).min(1),
  developerName: z.string().max(128).optional(),
  developerUrl: z.string().max(2048).optional(),
  description: z.string().max(512).optional(),
});

const DeleteClientSchema = z.object({
  intent: z.literal("delete"),
  clientId: z.string().min(1),
});

const RotateSecretSchema = z.object({
  intent: z.literal("rotate"),
  clientId: z.string().min(1),
});

const RevealSecretSchema = z.object({
  intent: z.literal("reveal"),
  clientId: z.string().min(1),
});

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);

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

    const { name, redirectUris, developerName, developerUrl, description } = parsed.data;
    const uris = redirectUris
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean);
    if (uris.length === 0)
      return data({ error: "At least one redirect URI is required" }, { status: 400 });

    try {
      const result = await getAuth(db).api.createOAuthClient({
        headers: request.headers,
        body: {
          client_name: name,
          redirect_uris: uris,
          token_endpoint_auth_method: "client_secret_basic",
          require_pkce: true,
        },
      });

      // Persist extra metadata not supported by BetterAuth's createOAuthClient API
      const clientId = (result as { client_id?: string } | null)?.client_id;
      if (clientId && (developerName || developerUrl || description)) {
        await db
          .update(oauthClient)
          .set({
            uri: developerUrl || null,
            metadata: JSON.stringify({
              ...(developerName && { developerName }),
              ...(description && { description }),
            }),
          })
          .where(eq(oauthClient.clientId, clientId));
      }

      return data({ created: result ?? null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create OAuth app";
      return data({ error: msg }, { status: 400 });
    }
  }

  if (intent === "update") {
    const parsed = UpdateClientSchema.safeParse(raw);
    if (!parsed.success)
      return data({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

    const { clientId, name, redirectUris, developerName, developerUrl, description } = parsed.data;

    // Scope update to the requesting organization's clients only
    const existing = await db.query.oauthClient.findFirst({
      where: and(eq(oauthClient.clientId, clientId), eq(oauthClient.referenceId, organizationId)),
      columns: { id: true },
    });
    if (!existing) return data({ error: "Not found" }, { status: 404 });

    await db
      .update(oauthClient)
      .set({
        name,
        redirectUris: JSON.stringify(redirectUris),
        uri: developerUrl || null,
        metadata: JSON.stringify({
          ...(developerName && { developerName }),
          ...(description && { description }),
        }),
      })
      .where(eq(oauthClient.clientId, clientId));

    return data({ updated: true });
  }

  if (intent === "delete") {
    const parsed = DeleteClientSchema.safeParse(raw);
    if (!parsed.success) return data({ error: "Invalid input" }, { status: 400 });
    try {
      await getAuth(db).api.deleteOAuthClient({
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
      const result = await getAuth(db).api.rotateClientSecret({
        headers: request.headers,
        body: { client_id: parsed.data.clientId },
      });
      return data({ secret: (result as { client_secret?: string } | null)?.client_secret ?? null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to rotate secret";
      return data({ error: msg }, { status: 400 });
    }
  }

  if (intent === "reveal") {
    const parsed = RevealSecretSchema.safeParse(raw);
    if (!parsed.success) return data({ error: "Invalid input" }, { status: 400 });

    const row = await db.query.oauthClient.findFirst({
      where: eq(oauthClient.clientId, parsed.data.clientId),
      columns: { clientSecret: true, referenceId: true },
    });

    if (!row || row.referenceId !== organizationId) {
      return data({ error: "Not found" }, { status: 404 });
    }

    const secret = row.clientSecret ?? null;
    const isHashed = secret?.startsWith("$2") ?? false;
    return data({ secret: isHashed ? null : secret });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
