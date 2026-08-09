import {
  AddChangelogRequestSchema,
  addChangelogRequest,
  listChangelogRequests,
} from "@feeduro/data-access/changelog/changelog-requests";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/changelog.$id.requests";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const requests = await listChangelogRequests(db, organizationId, params.id);
  if (requests === null) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ data: requests });
}

export async function action({ request, params, context }: Route.ActionArgs) {
  if (request.method !== "POST") {
    const err = apiError("method_not_allowed");
    return data(err.body, err.init);
  }

  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const err = apiError("invalid_body");
    return data(err.body, err.init);
  }

  const parsed = AddChangelogRequestSchema.safeParse(body);
  if (!parsed.success) {
    const err = apiError("validation_error", parsed.error.flatten());
    return data(err.body, err.init);
  }

  const result = await addChangelogRequest(db, organizationId, params.id, parsed.data.postId);
  if ("error" in result) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }

  return data({ data: result.data }, { status: 201 });
}
