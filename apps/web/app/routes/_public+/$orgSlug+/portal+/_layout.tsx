import { PortalLayout } from "@features/feedback/components/public/portal-layout";
import { buildPublicBoardMeta } from "@features/feedback/public-board-meta";
import { publicPageLoader } from "@features/feedback/server/public-loader";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/_layout";

export function loader({ request, params, context }: Route.LoaderArgs) {
  return publicPageLoader(getDb(context), { request, orgSlug: params.orgSlug });
}

// Portal data is stable per session | mutations use local state or window.location.reload().
// Prevent re-fetching 8+ DB queries on every tab navigation.
export function shouldRevalidate() {
  return false;
}

export function meta({ data, location }: Route.MetaArgs) {
  return buildPublicBoardMeta(data, location.search);
}

export default function PortalRoute({ loaderData }: Route.ComponentProps) {
  return <PortalLayout loaderData={loaderData} tabBasePath={`/${loaderData.org.slug}/portal`} />;
}
