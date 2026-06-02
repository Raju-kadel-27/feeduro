import { apiError } from "@feediyo/errors";
import { CreateVoteSchema, createVote } from "@features/feedback/server/api-votes-mutations";
import { ListVotesSchema, listVotes } from "@features/feedback/server/api-votes";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";

import type { Route } from "./+types/votes";

export async function loader({ request }: Route.LoaderArgs) {
  const organizationId = await requireApiKey(request);
  const url = new URL(request.url);

  const parsed = ListVotesSchema.safeParse({
    postId: url.searchParams.get("postId") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });

  if (!parsed.success) {
    const err = apiError("invalid_params", parsed.error.flatten());
    return data(err.body, err.init);
  }

  const result = await listVotes(organizationId, parsed.data);
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

  const parsed = CreateVoteSchema.safeParse(body);
  if (!parsed.success) {
    const err = apiError("validation_error", parsed.error.flatten());
    return data(err.body, err.init);
  }

  const result = await createVote(organizationId, parsed.data);

  if ("error" in result) {
    const err = apiError(result.error);
    return data(err.body, err.init);
  }

  return data({ data: result.data }, { status: 201 });
}
