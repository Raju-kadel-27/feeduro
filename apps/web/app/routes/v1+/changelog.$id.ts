import { getChangelog } from "@feeduro/data-access/changelog/changelog";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/changelog.$id";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const entry = await getChangelog(db, organizationId, params.id);
  if (!entry) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ data: entry });
}
