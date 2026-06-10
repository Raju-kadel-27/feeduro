import { apiError } from "@feeduro/errors";
import { ListRoadmapSchema, listRoadmap } from "@features/roadmap/server/api-roadmap";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";

import type { Route } from "./+types/roadmap";

export async function loader({ request }: Route.LoaderArgs) {
  const organizationId = await requireApiKey(request);
  const url = new URL(request.url);

  const parsed = ListRoadmapSchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
  });

  if (!parsed.success) {
    const err = apiError("invalid_params", parsed.error.flatten());
    return data(err.body, err.init);
  }

  return data(await listRoadmap(organizationId, parsed.data.status));
}
