import { apiError } from "@feeduro/errors";
import { deleteUser, getUser } from "@features/segmentation/server/api-users";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";

import type { Route } from "./+types/users.$id";

export async function loader({ request, params }: Route.LoaderArgs) {
  const organizationId = await requireApiKey(request);
  const profile = await getUser(organizationId, params.id);
  if (!profile) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ data: profile });
}

export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "DELETE") {
    const err = apiError("method_not_allowed");
    return data(err.body, err.init);
  }

  const organizationId = await requireApiKey(request);
  const deleted = await deleteUser(organizationId, params.id);

  if (!deleted) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ success: true });
}
