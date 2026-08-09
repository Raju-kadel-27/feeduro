import { requireOrgBySlug } from "@features/auth/server/guards";
import { getDb } from "~/middleware/cloudflare.server";
import { EndpointDetail } from "@features/internal/webhooks/components/endpoint-detail";
import { getWebhookDetailLoaderData } from "@features/internal/webhooks/server/queries";
import { data } from "react-router";
import type { Route } from "./+types/$endpointId";

export function meta() {
  return [{ title: "Webhook — Feeduro" }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);
  const result = await getWebhookDetailLoaderData(
    session.user.id,
    organizationId,
    params.endpointId,
  );
  if (!result) throw new Response("Not found", { status: 404 });
  return data(result);
}

export default function WebhookDetailRoute({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
      </header>
      <EndpointDetail endpoint={loaderData.endpoint} isAdmin={loaderData.isAdmin} />
    </>
  );
}
