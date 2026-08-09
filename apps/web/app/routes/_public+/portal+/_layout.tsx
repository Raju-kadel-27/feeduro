import { getOrgSubdomain } from "@features/domains/server/subdomain-routing";
import { PortalLayout } from "@features/feedback/components/public/portal-layout";
import { buildPublicBoardMeta } from "@features/feedback/public-board-meta";
import { publicPageLoader } from "@features/feedback/server/public-loader";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/_layout";

export async function loader({ request, context }: Route.LoaderArgs) {
  const orgSlug = getOrgSubdomain(new URL(request.url).hostname);
  if (!orgSlug) throw new Response("Not Found", { status: 404 });
  return publicPageLoader(getDb(context), { request, orgSlug });
}

export function meta({ data, location }: Route.MetaArgs) {
  return buildPublicBoardMeta(data, location.search);
}

export default function SubdomainPortalRoute({ loaderData }: Route.ComponentProps) {
  return <PortalLayout loaderData={loaderData} tabBasePath="/portal" />;
}
