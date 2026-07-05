import { deleteUser, getUser } from "@features/internal/segmentation/server/api-users";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { getDb } from "~/middleware/cloudflare.server";
import { data } from "react-router";

import type { Route } from "./+types/users.$id";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const profile = await getUser(db, organizationId, params.id);
  if (!profile) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ data: profile });
}

export async function action({ request, params, context }: Route.ActionArgs) {
  if (request.method !== "DELETE") {
    const err = apiError("method_not_allowed");
    return data(err.body, err.init);
  }

  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const deleted = await deleteUser(db, organizationId, params.id);

  if (!deleted) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ success: true });
}
