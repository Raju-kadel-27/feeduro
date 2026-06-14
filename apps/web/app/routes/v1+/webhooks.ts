import { CreateWebhookSchema } from "@features/internal/webhooks/schemas/endpoint";
import { createWebhook } from "@features/internal/webhooks/server/api-webhooks";
import { listWebhooks } from "@features/internal/webhooks/server/queries";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";

import type { Route } from "./+types/webhooks";

export async function loader({ request }: Route.LoaderArgs) {
  const organizationId = await requireApiKey(request);
  return data(await listWebhooks(organizationId));
}

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

  const parsed = CreateWebhookSchema.safeParse(body);
  if (!parsed.success) {
    const err = apiError("validation_error", parsed.error.flatten());
    return data(err.body, err.init);
  }

  const result = await createWebhook(organizationId, parsed.data);
  if ("error" in result) {
    const err = apiError("limit_reached");
    return data(err.body, err.init);
  }

  return data({ data: result.data }, { status: 201 });
}
