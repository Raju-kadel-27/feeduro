import { apiError } from "@feeduro/errors";
import { deleteComment } from "@features/feedback/server/api-comments-mutations";
import { getComment } from "@features/feedback/server/api-comments";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";

import type { Route } from "./+types/comments.$id";

export async function loader({ request, params }: Route.LoaderArgs) {
  const organizationId = await requireApiKey(request);
  const comment = await getComment(organizationId, params.id);
  if (!comment) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ data: comment });
}

export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "DELETE") {
    const err = apiError("method_not_allowed");
    return data(err.body, err.init);
  }

  const organizationId = await requireApiKey(request);
  const deleted = await deleteComment(organizationId, params.id);

  if (!deleted) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ success: true });
}
