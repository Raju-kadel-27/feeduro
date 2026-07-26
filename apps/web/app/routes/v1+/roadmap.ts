import { ListRoadmapSchema, listRoadmap } from "@feeduro/data-access/roadmap/roadmap";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/roadmap";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const url = new URL(request.url);

  const parsed = ListRoadmapSchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
  });

  if (!parsed.success) {
    const err = apiError("invalid_params", parsed.error.flatten());
    return data(err.body, err.init);
  }

  return data(await listRoadmap(db, organizationId, parsed.data.status));
}
