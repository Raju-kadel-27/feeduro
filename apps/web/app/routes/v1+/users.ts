import { apiError } from "@feeduro/errors";
import { ListUsersSchema, listUsers } from "@features/internal/segmentation/server/api-users";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";

import type { Route } from "./+types/users";

export async function loader({ request }: Route.LoaderArgs) {
  const organizationId = await requireApiKey(request);
  const url = new URL(request.url);

  const parsed = ListUsersSchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });

  if (!parsed.success) {
    const err = apiError("invalid_params", parsed.error.flatten());
    return data(err.body, err.init);
  }

  return data(await listUsers(organizationId, parsed.data));
}
