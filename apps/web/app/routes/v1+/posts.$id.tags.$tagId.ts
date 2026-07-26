import { removePostTag } from "@feeduro/data-access/feedback/tags";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/posts.$id.tags.$tagId";

export async function action({ request, params, context }: Route.ActionArgs) {
  if (request.method !== "DELETE") {
    const err = apiError("method_not_allowed");
    return data(err.body, err.init);
  }

  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const removed = await removePostTag(db, organizationId, params.id, params.tagId);

  if (!removed) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ success: true });
}
