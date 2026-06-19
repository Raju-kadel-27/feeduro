import { requireOrgBySlug } from "@features/auth/server/guards";
import WebhooksSettings from "@features/internal/webhooks/components/webhooks-settings";
import { getWebhooksLoaderData } from "@features/internal/webhooks/server/queries";
import { SidebarTrigger } from "@/app/components/ui/sidebar";

import type { Route } from "./+types/index";

export function meta() {
  return [{ title: "Webhooks — Feeduro" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrgBySlug(request, params.orgSlug);
  return getWebhooksLoaderData(session.user.id, organizationId);
}

export default function WebhooksRoute({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <WebhooksSettings loaderData={loaderData} />
    </>
  );
}
