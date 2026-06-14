import { resolveApiOrganizationId } from "@features/auth/server/guards";
import { IdentifyUserSchema } from "@features/internal/segmentation/schemas/identify";
import { upsertUserProfile } from "@features/internal/segmentation/server/service";
import { data } from "react-router";

import type { Route } from "./+types/user-profiles";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  const organizationId = await resolveApiOrganizationId(request);
  if (!organizationId) return data({ error: "Unauthorized" }, { status: 401 });

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
