import { apiError } from "@feeduro/errors";
import { getBoard } from "@features/feedback/server/api-boards";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";

import type { Route } from "./+types/boards.$id";

export async function loader({ request, params }: Route.LoaderArgs) {
  const organizationId = await requireApiKey(request);
  const board = await getBoard(organizationId, params.id);
  if (!board) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ data: board });
}
