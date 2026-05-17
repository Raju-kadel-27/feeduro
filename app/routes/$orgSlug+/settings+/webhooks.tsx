import { requireOrgBySlug } from "@features/auth/server/guards";
import { getWebhooksLoaderData } from "@features/webhooks/server/queries";
import WebhooksSettings from "@features/webhooks/components/webhooks-settings";

import type { Route } from "./+types/webhooks";

export function meta() {
  return [{ title: "Webhooks — Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrgBySlug(request, params.orgSlug);
  return getWebhooksLoaderData(session.user.id, organizationId);
}

export default WebhooksSettings;
