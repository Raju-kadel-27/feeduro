import {
  CreateChangelogSchema,
  createChangelog,
  ListChangelogSchema,
  listChangelogs,
} from "@features/changelog/server/api-changelog";
import { dispatchWebhook } from "@features/internal/webhooks/server/dispatch";
import { apiError } from "@feeduro/errors";
import { requireApiKey } from "@lib/api/require-api-key";
import { getDb } from "~/middleware/cloudflare.server";
import { data } from "react-router";

import type { Route } from "./+types/changelog";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const organizationId = await requireApiKey(db, request);
  const url = new URL(request.url);

  const parsed = ListChangelogSchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });

  if (!parsed.success) {
    const err = apiError("invalid_params", parsed.error.flatten());
    return data(err.body, err.init);
  }

  return data(await listChangelogs(organizationId, parsed.data));
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

  const parsed = CreateChangelogSchema.safeParse(body);
  if (!parsed.success) {
    const err = apiError("validation_error", parsed.error.flatten());
    return data(err.body, err.init);
  }

  const entry = await createChangelog(organizationId, parsed.data);

  dispatchWebhook(context, organizationId, "changelog.created", {
    id: entry.id,
    title: entry.title,
    slug: entry.slug,
    status: entry.status,
    createdAt: entry.createdAt,
  });

  if (entry.status === "published") {
    dispatchWebhook(context, organizationId, "changelog.published", {
      id: entry.id,
      title: entry.title,
      slug: entry.slug,
      publishedAt: entry.publishedAt?.toISOString(),
    });
  }

  return data({ data: entry }, { status: 201 });
}
