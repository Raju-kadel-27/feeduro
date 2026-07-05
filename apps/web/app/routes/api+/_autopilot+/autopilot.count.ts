import { requireOrganization } from "@features/auth/server/guards";
import { getPendingSuggestionsCount } from "@features/internal/autopilot/server/queries";
import { getDb } from "@middleware/cloudflare.server";
import { data } from "react-router";

import type { Route } from "./+types/autopilot.count";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);
  const count = await getPendingSuggestionsCount(db, organizationId);
  return data({ count });
}
