import { listBoards } from "@feeduro/data-access/feedback/boards";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/boards";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const boards = await listBoards(db, organizationId);
  return data({ data: boards });
}
