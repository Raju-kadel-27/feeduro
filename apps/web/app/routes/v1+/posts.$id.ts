import { apiError } from "@feeduro/errors";
import { deletePost, updatePost } from "@features/feedback/server/api-posts-mutations";
import { UpdatePostSchema, getPost } from "@features/feedback/server/api-posts";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";

import type { Route } from "./+types/posts.$id";

export async function loader({ request, params }: Route.LoaderArgs) {
  const organizationId = await requireApiKey(request);
  const post = await getPost(organizationId, params.id);
  if (!post) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }
  return data({ data: post });
}

export async function action({ request, params }: Route.ActionArgs) {
  const organizationId = await requireApiKey(request);

  if (request.method === "DELETE") {
    const deleted = await deletePost(organizationId, params.id);
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

    const post = await updatePost(organizationId, params.id, parsed.data);
    if (!post) {
      const err = apiError("not_found");
      return data(err.body, err.init);
    }
    return data({ data: post });
  }

  const err = apiError("method_not_allowed");
  return data(err.body, err.init);
}
