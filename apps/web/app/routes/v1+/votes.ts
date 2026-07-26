import { notifyVoteMilestoneIfReached } from "@features/internal/notifications/server/service";
import { ListVotesSchema, listVotes } from "@feeduro/data-access/feedback/votes";
import { CreateVoteSchema, createVote } from "@feeduro/data-access/feedback/votes-mutations";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { data } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/votes";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
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

  const result = await listVotes(db, organizationId, parsed.data);
  return data(result);
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

  const parsed = CreateVoteSchema.safeParse(body);
  if (!parsed.success) {
    const err = apiError("validation_error", parsed.error.flatten());
    return data(err.body, err.init);
  }

  const result = await createVote(db, organizationId, parsed.data, ({ postId, organizationId: orgId, newVoteCount }) => {
    notifyVoteMilestoneIfReached({ postId, organizationId: orgId, newVoteCount }).catch(() => {});
  });

  if ("error" in result) {
    const err = apiError(result.error);
    return data(err.body, err.init);
  }

  return data({ data: result.data }, { status: 201 });
}
