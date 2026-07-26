import { getPost, UpdatePostSchema } from "@feeduro/data-access/feedback/posts";
import { deletePost, updatePost } from "@feeduro/data-access/feedback/posts-mutations";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/posts.$id";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const post = await getPost(db, organizationId, params.id);
  if (!post) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ data: post });
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);

  if (request.method === "DELETE") {
    const deleted = await deletePost(db, organizationId, params.id);
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

    const parsed = UpdatePostSchema.safeParse(body);
    if (!parsed.success) {
      const err = apiError("validation_error", parsed.error.flatten());
      return data(err.body, err.init);
    }

    const post = await updatePost(db, organizationId, params.id, parsed.data);
    if (!post) {
      const err = apiError("not_found");
      return data(err.body, err.init);
    }
    return data({ data: post });
  }

  const err = apiError("method_not_allowed");
  return data(err.body, err.init);
}
