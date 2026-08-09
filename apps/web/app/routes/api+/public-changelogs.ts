import { listPublicChangelogEntries } from "@features/changelog/server/list-public-entries";
import { getSession } from "@lib/session";
import { eq } from "drizzle-orm";
import { data } from "react-router";
import { organization } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/public-changelogs";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const url = new URL(request.url);
  const orgSlug = url.searchParams.get("orgSlug");
  if (!orgSlug) return data({ error: "orgSlug required" }, { status: 400 });

  const org = await db.query.organization.findFirst({
    where: eq(organization.slug, orgSlug),
    columns: { id: true },
  });
  if (!org) return data({ error: "Not found" }, { status: 404 });

  const session = await getSession(db, request);
  const userId = session?.user?.id ?? null;

  const cursor = url.searchParams.get("cursor") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "10"), 50);

  const result = await listPublicChangelogEntries(db, org.id, userId, { limit, cursor, search });
  return data(result);
}
