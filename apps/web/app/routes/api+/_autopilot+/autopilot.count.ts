import { requireOrganization } from "@features/auth/server/guards";
import { getPendingSuggestionsCount } from "@features/internal/autopilot/server/queries";
import { data } from "react-router";

import type { Route } from "./+types/autopilot.count";

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);
  const count = await getPendingSuggestionsCount(organizationId);
  return data({ count });
}
