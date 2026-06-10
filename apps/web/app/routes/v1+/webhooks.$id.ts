import { apiError } from "@feeduro/errors";
import { UpdateWebhookSchema } from "@features/webhooks/schemas/endpoint";
import { deleteWebhook, updateWebhook } from "@features/webhooks/server/api-webhooks";
import { getWebhook } from "@features/webhooks/server/queries";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";

import type { Route } from "./+types/webhooks.$id";

export async function loader({ request, params }: Route.LoaderArgs) {
  const organizationId = await requireApiKey(request);
  const ep = await getWebhook(organizationId, params.id);
  if (!ep) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ data: ep });
}

export async function action({ request, params }: Route.ActionArgs) {
  const organizationId = await requireApiKey(request);

  if (request.method === "DELETE") {
    const deleted = await deleteWebhook(organizationId, params.id);
    if (!deleted) {
      const err = apiError("not_found");
      return data(err.body, err.init);
    }
    return data({ success: true });
  }

  if (request.method === "PATCH") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const err = apiError("invalid_body");
      return data(err.body, err.init);
    }

    const parsed = UpdateWebhookSchema.safeParse(body);
    if (!parsed.success) {
      const err = apiError("validation_error", parsed.error.flatten());
      return data(err.body, err.init);
    }

    const updated = await updateWebhook(organizationId, params.id, parsed.data);
    if (!updated) {
      const err = apiError("not_found");
      return data(err.body, err.init);
    }
    return data({ success: true });
  }

  const err = apiError("method_not_allowed");
  return data(err.body, err.init);
}
