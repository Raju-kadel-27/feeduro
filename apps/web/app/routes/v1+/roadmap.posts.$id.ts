import { apiError } from "@feediyo/errors";
import { UpdateRoadmapPostSchema, updateRoadmapPost } from "@features/roadmap/server/api-roadmap";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";

import type { Route } from "./+types/roadmap.posts.$id";

export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "PATCH") {
    const err = apiError("method_not_allowed");
    return data(err.body, err.init);
  }

  const organizationId = await requireApiKey(request);

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

  const updated = await updateRoadmapPost(organizationId, params.id, parsed.data);
  if (!updated) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }

  return data({ data: updated });
}
