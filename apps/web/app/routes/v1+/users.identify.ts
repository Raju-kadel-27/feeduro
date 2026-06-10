import { apiError } from "@feeduro/errors";
import { IdentifyUserSchema } from "@features/segmentation/schemas/identify";
import { upsertUserProfile } from "@features/segmentation/server/service";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";

import type { Route } from "./+types/users.identify";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    const err = apiError("method_not_allowed");
    return data(err.body, err.init);
  }

  const organizationId = await requireApiKey(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const err = apiError("invalid_body");
    return data(err.body, err.init);
  }

  const parsed = IdentifyUserSchema.safeParse(body);
  if (!parsed.success) {
    const err = apiError("validation_error", parsed.error.flatten());
    return data(err.body, err.init);
  }

  const id = await upsertUserProfile(organizationId, parsed.data);
  return data({ data: { id } });
}
