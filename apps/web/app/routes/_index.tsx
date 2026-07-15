import { getOrgSubdomain } from "@features/domains/server/subdomain-routing";
import { PublicBoardPage } from "@features/feedback/components/public/public-board-page";
import { buildPublicBoardMeta } from "@features/feedback/public-board-meta";
import { publicPageLoader } from "@features/feedback/server/public-loader";
import { resolveOrgRedirect } from "@features/internal/workspace/server/queries";
import { LandingPage } from "@features/public/landing/landing-page";
import { getSession } from "@lib/session";
import { redirect } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/_index";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);

  // Org subdomains serve the public board at `/`. The branch happens here, on
  // the host, so the server and the hydrating client match the same route —
  // a worker-level URL rewrite breaks hydration because the client router
  // matches from the browser URL. Never redirect signed-in members to the
  // dashboard on a subdomain; they are viewing their own public board.
  const orgSlug = getOrgSubdomain(new URL(request.url).hostname);
  if (orgSlug) {
    return publicPageLoader(db, { request, orgSlug });
  }

  const session = await getSession(db, request);
  if (session) {
    const { slug, responseHeaders } = await resolveOrgRedirect(db, request, session);
    throw redirect(slug ? `/${slug}/dashboard` : "/onboarding", { headers: responseHeaders });
  }
  return null;
}

export function meta({ data, location }: Route.MetaArgs) {
  if (data && "org" in data) return buildPublicBoardMeta(data, location.search);
  return [];
}

export function ErrorBoundary() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Something went wrong. Please refresh.</p>
    </div>
  );
}

export default function IndexRoute({ loaderData }: Route.ComponentProps) {
  if (loaderData && "org" in loaderData) {
    return <PublicBoardPage loaderData={loaderData} />;
  }
  return <LandingPage />;
}
