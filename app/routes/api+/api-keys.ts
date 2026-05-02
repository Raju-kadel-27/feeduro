import { auth } from "@lib/auth/server";
import { requireOrganization } from "@lib/session.server";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { apikey, member } from "@/db/schema";
import type { Route } from "./+types/api-keys";

async function requireAdmin(organizationId: string, userId: string) {
  const db = getDb();
  const rec = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
  });
  return rec?.role === "admin";
}

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

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);

  const isAdmin = await requireAdmin(organizationId, session.user.id);
  if (!isAdmin) {
    return data({ error: "Only admins can manage API keys" }, { status: 403 });
  }

  const body = (await request.json()) as { intent: string; [key: string]: unknown };

  if (body.intent === "create") {
    const name = (body.name as string)?.trim();
    if (!name) return data({ error: "Name is required" }, { status: 400 });

    try {
      const result = await auth.api.createApiKey({
        body: {
          name,
          organizationId,
          expiresIn: (body.expiresIn as number | null) ?? null,
        },
        headers: request.headers,
      });
      return data({ success: true, key: result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create API key";
      return data({ error: msg }, { status: 400 });
    }
  }

  if (body.intent === "delete") {
    const keyId = body.keyId as string;
    if (!keyId) return data({ error: "keyId is required" }, { status: 400 });

    try {
      await auth.api.deleteApiKey({
        body: { keyId },
        headers: request.headers,
      });
      return data({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete API key";
      return data({ error: msg }, { status: 400 });
    }
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
