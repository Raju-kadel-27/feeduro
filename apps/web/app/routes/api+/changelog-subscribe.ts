import { SubscribeSchema } from "@features/changelog/schemas/subscribers";
import { subscribeEmail } from "@features/changelog/server/subscribers";
import { eq } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { organization } from "@/db/schema";

import type { Route } from "./+types/changelog-subscribe";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  const raw = await request.json();
  const parsed = SubscribeSchema.safeParse(raw);
  if (!parsed.success) {
    return data({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { email, orgSlug } = parsed.data;
  const db = getDb();

  const org = await db.query.organization.findFirst({
    where: eq(organization.slug, orgSlug),
    columns: { id: true, metadata: true },
  });

  if (!org) return data({ error: "Organization not found" }, { status: 404 });

  // Verify subscriptions are enabled for this org
  let subscriptionsEnabled = false;
  try {
    const meta = JSON.parse(org.metadata ?? "{}") as Record<string, unknown>;
    const settings = meta.changelogSettings as Record<string, unknown> | undefined;
    subscriptionsEnabled = settings?.emailSubscriptionsEnabled === true;
  } catch {}

  if (!subscriptionsEnabled) {
    return data({ error: "Subscriptions are not enabled" }, { status: 403 });
  }

  const { alreadySubscribed } = await subscribeEmail(org.id, email);

  return data({ success: true, alreadySubscribed });
}
