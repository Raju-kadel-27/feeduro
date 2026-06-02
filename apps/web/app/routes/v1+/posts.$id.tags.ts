import { apiError } from "@feediyo/errors";
import { AddTagToPostSchema, addPostTag } from "@features/feedback/server/api-tags";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";

import type { Route } from "./+types/posts.$id.tags";

export async function action({ request, params }: Route.ActionArgs) {
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

  const parsed = AddTagToPostSchema.safeParse(body);
  if (!parsed.success) {
    const err = apiError("validation_error", parsed.error.flatten());
    return data(err.body, err.init);
  }

  const result = await addPostTag(organizationId, params.id, parsed.data.tagId);

  if ("error" in result) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }

  return data({ data: result.data }, { status: 201 });
}
