import { apiError } from "@feeduro/errors";
import { getChangelog } from "@features/changelog/server/api-changelog";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";

import type { Route } from "./+types/changelog.$id";

export async function loader({ request, params }: Route.LoaderArgs) {
  const organizationId = await requireApiKey(request);
  const entry = await getChangelog(organizationId, params.id);
  if (!entry) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ data: entry });
}
