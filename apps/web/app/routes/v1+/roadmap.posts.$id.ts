import { UpdateRoadmapPostSchema, updateRoadmapPost } from "@feeduro/data-access/roadmap/roadmap";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/roadmap.posts.$id";

export async function action({ request, params, context }: Route.ActionArgs) {
  if (request.method !== "PATCH") {
    const err = apiError("method_not_allowed");
    return data(err.body, err.init);
  }

  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const err = apiError("invalid_body");
    return data(err.body, err.init);
  }

  const parsed = UpdateRoadmapPostSchema.safeParse(body);
  if (!parsed.success) {
    const err = apiError("validation_error", parsed.error.flatten());
    return data(err.body, err.init);
  }

  const updated = await updateRoadmapPost(db, organizationId, params.id, parsed.data);
  if (!updated) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }

  return data({ data: updated });
}
