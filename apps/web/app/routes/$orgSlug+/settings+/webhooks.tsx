import { requireOrgBySlug } from "@features/auth/server/guards";
import WebhooksSettings from "@features/internal/webhooks/components/webhooks-settings";
import { getWebhooksLoaderData } from "@features/internal/webhooks/server/queries";

import type { Route } from "./+types/webhooks";

export function meta() {
  return [{ title: "Webhooks — Feeduro" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrgBySlug(request, params.orgSlug);
  return getWebhooksLoaderData(session.user.id, organizationId);
}

export default WebhooksSettings;
