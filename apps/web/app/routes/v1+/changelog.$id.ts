import { getChangelog } from "@feeduro/data-access/changelog/changelog";
import {
  deleteChangelog,
  UpdateChangelogSchema,
  updateChangelog,
} from "@feeduro/data-access/changelog/changelog-mutations";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/changelog.$id";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const entry = await getChangelog(db, organizationId, params.id);
  if (!entry) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ data: entry });
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);

  if (request.method === "DELETE") {
    const deleted = await deleteChangelog(db, organizationId, params.id);
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

    const parsed = UpdateChangelogSchema.safeParse(body);
    if (!parsed.success) {
      const err = apiError("validation_error", parsed.error.flatten());
      return data(err.body, err.init);
    }

    const entry = await updateChangelog(db, organizationId, params.id, parsed.data);
    if (!entry) {
      const err = apiError("not_found");
      return data(err.body, err.init);
    }
    return data({ data: entry });
  }

  const err = apiError("method_not_allowed");
  return data(err.body, err.init);
}
