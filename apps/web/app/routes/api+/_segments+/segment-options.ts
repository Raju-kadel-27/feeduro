import { requireOrganization } from "@features/auth/server/guards";
import { getSegmentTraitOptions } from "@features/internal/segmentation/server/service";
import { data } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/segment-options";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);
  const options = await getSegmentTraitOptions(db, organizationId);
  return data(options);
}
