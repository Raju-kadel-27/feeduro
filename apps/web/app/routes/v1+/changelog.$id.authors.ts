import {
  AddChangelogAuthorSchema,
  addChangelogAuthor,
  listChangelogAuthors,
} from "@feeduro/data-access/changelog/changelog-authors";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/changelog.$id.authors";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const authors = await listChangelogAuthors(db, organizationId, params.id);
  if (authors === null) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ data: authors });
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

  const parsed = AddChangelogAuthorSchema.safeParse(body);
  if (!parsed.success) {
    const err = apiError("validation_error", parsed.error.flatten());
    return data(err.body, err.init);
  }

  const result = await addChangelogAuthor(db, organizationId, params.id, parsed.data.userId);
  if ("error" in result) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }

  return data({ data: result.data }, { status: 201 });
}
