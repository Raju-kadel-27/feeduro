import { logOrgActivity } from "@features/internal/audit/server/log-org-activity";
import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { z } from "zod";
import { auth } from "@/app/lib/auth/server";
import { getDb } from "@/db";
import { apikey } from "@/db/schema";

import type { Route } from "./+types/api-keys";

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);
  const db = getDb();

  const keys = await db.query.apikey.findMany({
    where: eq(apikey.referenceId, organizationId),
    columns: {
      id: true,
      name: true,
      start: true,
      prefix: true,
      createdAt: true,
      expiresAt: true,
      lastRequest: true,
      enabled: true,
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return data({ keys });
}

const CreateKeySchema = z.object({
  intent: z.literal("create"),
  name: z.string().min(1, "Name is required").max(32, "Name must be 32 characters or fewer"),
  expiresIn: z.number().int().positive().max(157_680_000, "Expiry cannot exceed 5 years").nullable().optional(),
});

const DeleteKeySchema = z.object({
  intent: z.literal("delete"),
  keyId: z.string().min(1, "keyId is required"),
});

const BodySchema = z.discriminatedUnion("intent", [CreateKeySchema, DeleteKeySchema]);

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);

  await requirePermission(organizationId, session.user.id, { settings: ["update"] });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return data({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Invalid request";
    return data({ error: message }, { status: 400 });
  }

  const body = parsed.data;

  if (body.intent === "create") {
    try {
      const result = await auth.api.createApiKey({
        body: {
          name: body.name,
          organizationId,
          expiresIn: body.expiresIn ?? null,
        },
        headers: request.headers,
      });
      await logOrgActivity({
        orgId: organizationId,
        actor: { id: session.user.id, email: session.user.email, name: session.user.name },
        action: "api_key_created",
        target: { type: "api_key", id: result.id },
        metadata: { name: body.name },
        request,
      });
      return data({ success: true, key: result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create API key";
      return data({ error: msg }, { status: 400 });
    }
  }

  // Verify the key belongs to this org before deleting
  const db = getDb();
  const existing = await db.query.apikey.findFirst({
    where: and(eq(apikey.id, body.keyId), eq(apikey.referenceId, organizationId)),
    columns: { id: true },
  });
  if (!existing) {
    return data({ error: "Key not found" }, { status: 404 });
  }

  try {
    await auth.api.deleteApiKey({
      body: { keyId: body.keyId },
      headers: request.headers,
    });
    await logOrgActivity({
      orgId: organizationId,
      actor: { id: session.user.id, email: session.user.email, name: session.user.name },
      action: "api_key_deleted",
      target: { type: "api_key", id: body.keyId },
      request,
    });
    return data({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete API key";
    return data({ error: msg }, { status: 400 });
  }
}
