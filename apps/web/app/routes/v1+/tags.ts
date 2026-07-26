import { CreateTagSchema, createOrgTag, listTags } from "@feeduro/data-access/feedback/tags";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/tags";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const tags = await listTags(db, organizationId);
  return data({ data: tags });
}

export async function action({ request, context }: Route.ActionArgs) {
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

  const parsed = CreateTagSchema.safeParse(body);
  if (!parsed.success) {
    const err = apiError("validation_error", parsed.error.flatten());
    return data(err.body, err.init);
  }

  const result = await createOrgTag(db, organizationId, parsed.data);

  if ("error" in result) {
    const err = apiError("conflict");
    return data(err.body, err.init);
  }

  return data({ data: result.data }, { status: 201 });
}
