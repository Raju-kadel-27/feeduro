import { getWebhook } from "@feeduro/data-access/webhooks/queries";
import { deleteWebhook, UpdateWebhookSchema, updateWebhook } from "@feeduro/data-access/webhooks/webhooks";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/webhooks.$id";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const ep = await getWebhook(db, organizationId, params.id);
  if (!ep) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ data: ep });
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);

  if (request.method === "DELETE") {
    const deleted = await deleteWebhook(db, organizationId, params.id);
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

    const updated = await updateWebhook(db, organizationId, params.id, parsed.data);
    if (!updated) {
      const err = apiError("not_found");
      return data(err.body, err.init);
    }
    return data({ success: true });
  }

  const err = apiError("method_not_allowed");
  return data(err.body, err.init);
}
