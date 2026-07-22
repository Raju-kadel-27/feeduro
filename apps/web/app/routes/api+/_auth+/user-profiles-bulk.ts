import { resolveApiOrganizationId } from "@features/auth/server/guards";
import { IdentifyUserSchema } from "@features/internal/segmentation/schemas/identify";
import { bulkUpsertUserProfiles } from "@features/internal/segmentation/server/service";
import { data } from "react-router";
import { z } from "zod";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/user-profiles-bulk";

const BulkImportSchema = z.object({
  profiles: z.array(IdentifyUserSchema).min(1).max(5000),
});

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  const organizationId = await resolveApiOrganizationId(db, request);
  if (!organizationId) return data({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return data({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BulkImportSchema.safeParse(body);
  if (!parsed.success) {
    return data({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const result = await bulkUpsertUserProfiles(db, organizationId, parsed.data.profiles);
  return data({ success: true, ...result });
}
