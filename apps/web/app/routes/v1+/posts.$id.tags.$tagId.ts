import { removePostTag } from "@features/feedback/server/api-tags";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";

import type { Route } from "./+types/posts.$id.tags.$tagId";

export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "DELETE") {
    const err = apiError("method_not_allowed");
    return data(err.body, err.init);
  }

  const organizationId = await requireApiKey(request);
  const removed = await removePostTag(organizationId, params.id, params.tagId);

  if (!removed) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ success: true });
}
