import { getComment } from "@features/feedback/server/api-comments";
import { deleteComment } from "@features/feedback/server/api-comments-mutations";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { getDb } from "~/middleware/cloudflare.server";
import { data } from "react-router";

import type { Route } from "./+types/comments.$id";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const comment = await getComment(db, organizationId, params.id);
  if (!comment) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ data: comment });
}

export async function action({ request, params, context }: Route.ActionArgs) {
  if (request.method !== "DELETE") {
    const err = apiError("method_not_allowed");
    return data(err.body, err.init);
  }

  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const deleted = await deleteComment(db, organizationId, params.id);

  if (!deleted) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ success: true });
}
