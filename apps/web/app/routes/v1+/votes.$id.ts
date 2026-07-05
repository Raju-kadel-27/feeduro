import { deleteVote } from "@features/feedback/server/api-votes-mutations";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { getDb } from "~/middleware/cloudflare.server";
import { data } from "react-router";

import type { Route } from "./+types/votes.$id";

export async function action({ request, params, context }: Route.ActionArgs) {
  if (request.method !== "DELETE") {
    const err = apiError("method_not_allowed");
    return data(err.body, err.init);
  }

  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const deleted = await deleteVote(db, organizationId, params.id);

  if (!deleted) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ success: true });
}
