import { apiError } from "@feediyo/errors";
import {
  ListStatusChangesSchema,
  listStatusChanges,
} from "@features/feedback/server/api-status-changes";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";

import type { Route } from "./+types/posts.$id.status-changes";

export async function loader({ request, params }: Route.LoaderArgs) {
  const organizationId = await requireApiKey(request);
  const url = new URL(request.url);

  const parsed = ListStatusChangesSchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });

  if (!parsed.success) {
    const err = apiError("invalid_params", parsed.error.flatten());
    return data(err.body, err.init);
  }

  const result = await listStatusChanges(organizationId, params.id, parsed.data);
  if (!result) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }

  return data(result);
}
