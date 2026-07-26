import {
  CreateCategorySchema,
  createOrgCategory,
  listCategories,
} from "@feeduro/data-access/feedback/categories";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/categories";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const categories = await listCategories(db, organizationId);
  return data({ data: categories });
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

  const parsed = CreateCategorySchema.safeParse(body);
  if (!parsed.success) {
    const err = apiError("validation_error", parsed.error.flatten());
    return data(err.body, err.init);
  }

  const result = await createOrgCategory(db, organizationId, parsed.data);

  if ("error" in result) {
    const err = apiError("conflict");
    return data(err.body, err.init);
  }

  return data({ data: result.data }, { status: 201 });
}
