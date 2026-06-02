import { apiError } from "@feediyo/errors";
import { createPost } from "@features/feedback/server/api-posts-mutations";
import { CreatePostSchema, ListPostsSchema, listPosts } from "@features/feedback/server/api-posts";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";

import type { Route } from "./+types/posts";

export async function loader({ request }: Route.LoaderArgs) {
  const organizationId = await requireApiKey(request);
  const url = new URL(request.url);

  const parsed = ListPostsSchema.safeParse({
    boardId: url.searchParams.get("boardId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });

  if (!parsed.success) {
    const err = apiError("invalid_params", parsed.error.flatten());
    return data(err.body, err.init);
  }

  const result = await listPosts(organizationId, parsed.data);
  return data(result);
}

export async function action({ request }: Route.ActionArgs) {
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

  const parsed = CreatePostSchema.safeParse(body);
  if (!parsed.success) {
    const err = apiError("validation_error", parsed.error.flatten());
    return data(err.body, err.init);
  }

  const post = await createPost(organizationId, parsed.data);
  if (!post) {
    const err = apiError("not_found");
    return data(err.body, err.init);
  }

  return data({ data: post }, { status: 201 });
}
