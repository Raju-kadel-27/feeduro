import { listBoards } from "@features/feedback/server/api-boards";
import { requireApiKey } from "@lib/api/require-api-key";
import { getDb } from "~/middleware/cloudflare.server";
import { data } from "react-router";

import type { Route } from "./+types/boards";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const boards = await listBoards(db, organizationId);
  return data({ data: boards });
}
