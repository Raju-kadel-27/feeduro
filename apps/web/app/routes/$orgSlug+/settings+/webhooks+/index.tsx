import { requireOrgBySlug } from "@features/auth/server/guards";
import { getDb } from "~/middleware/cloudflare.server";
import WebhooksSettings from "@features/internal/webhooks/components/webhooks-settings";
import { getWebhooksLoaderData } from "@features/internal/webhooks/server/queries";
import { SidebarTrigger } from "@/app/components/ui/sidebar";

import type { Route } from "./+types/index";

export function meta() {
  return [{ title: "Webhooks — Feeduro" }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);
  return getWebhooksLoaderData(db, session.user.id, organizationId);
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
