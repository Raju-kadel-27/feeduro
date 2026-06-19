import { requireOrgBySlug } from "@features/auth/server/guards";
import { EndpointDetail } from "@features/internal/webhooks/components/endpoint-detail";
import { getWebhookDetailLoaderData } from "@features/internal/webhooks/server/queries";
import { data } from "react-router";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import type { Route } from "./+types/$endpointId";

export function meta() {
  return [{ title: "Webhook — Feeduro" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrgBySlug(request, params.orgSlug);
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
        <SidebarTrigger className="-ml-1" />
      </header>
      <EndpointDetail endpoint={loaderData.endpoint} isAdmin={loaderData.isAdmin} />
    </>
  );
}
