import { listBoards } from "@features/feedback/server/api-boards";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";

import type { Route } from "./+types/boards";

export async function loader({ request }: Route.LoaderArgs) {
  const organizationId = await requireApiKey(request);
  const boards = await listBoards(organizationId);
  return data({ data: boards });
}
