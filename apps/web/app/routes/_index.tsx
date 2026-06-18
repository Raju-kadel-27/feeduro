import { resolveOrgRedirect } from "@features/internal/workspace/server/queries";
import { LandingPage } from "@features/public/landing/landing-page";
import { getSession } from "@lib/session";
import { redirect } from "react-router";

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request);
  if (session) {
    const { slug, responseHeaders } = await resolveOrgRedirect(request, session);
    throw redirect(slug ? `/${slug}/dashboard` : "/onboarding", { headers: responseHeaders });
  }
  return {};
}

export function ErrorBoundary() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Something went wrong. Please refresh.</p>
    </div>
  );
}

export default function IndexRoute() {
  return <LandingPage />;
}
