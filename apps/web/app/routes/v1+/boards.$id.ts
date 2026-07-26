import { getBoard } from "@feeduro/data-access/feedback/boards";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/boards.$id";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const board = await getBoard(db, organizationId, params.id);
  if (!board) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ data: board });
}
