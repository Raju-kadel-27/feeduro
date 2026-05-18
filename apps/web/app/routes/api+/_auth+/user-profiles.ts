import { IdentifyUserSchema } from "@features/segmentation/schemas/identify";
import { upsertUserProfile } from "@features/segmentation/server/service";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { auth } from "@/app/lib/auth/server";
import { getDb } from "@/db";
import { apikey } from "@/db/schema";

import type { Route } from "./+types/user-profiles";

async function resolveOrganizationId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session?.session.activeOrganizationId) {
    return session.session.activeOrganizationId;
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const db = getDb();
    const key = await db.query.apikey.findFirst({
      where: and(eq(apikey.key, token), eq(apikey.enabled, true)),
      columns: { referenceId: true, expiresAt: true },
    });
    if (key && (!key.expiresAt || key.expiresAt > new Date())) {
      return key.referenceId;
    }
  }

  return null;
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  const organizationId = await resolveOrganizationId(request);
  if (!organizationId) {
    return data({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return data({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = IdentifyUserSchema.safeParse(body);
  if (!parsed.success) {
    return data({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const id = await upsertUserProfile(organizationId, parsed.data);
  return data({ success: true, id });
}
