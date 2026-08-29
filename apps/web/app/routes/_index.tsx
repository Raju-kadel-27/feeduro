import { getOrgSubdomain } from "@features/domains/server/subdomain-routing";
import { resolveOrgRedirect } from "@features/internal/workspace/server/queries";
import { LandingPage } from "@features/public/landing/landing-page";
import { getSession } from "@lib/session";
import { redirect } from "react-router";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/_index";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "Feeduro | Turn Customer Feedback into Revenue" },
    {
      name: "description",
      content:
        "Feeduro helps SaaS teams capture customer feedback, prioritize by MRR impact, and close the loop automatically. Sync voted features to Jira, Linear, and Asana.",
    },
    { property: "og:title", content: "Feeduro | Turn Customer Feedback into Revenue" },
    {
      property: "og:description",
      content:
        "Capture feedback, see the MRR behind every request, and auto-notify users when you ship. The feedback OS built for revenue-driven teams.",
    },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Feeduro" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Feeduro | Turn Customer Feedback into Revenue" },
    {
      name: "twitter:description",
      content:
        "Capture feedback, prioritize by MRR, close the loop automatically. The feedback OS for SaaS teams.",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);

  const orgSlug = getOrgSubdomain(new URL(request.url).hostname);
  if (orgSlug) {
    return redirect("/portal/feedback");
  }

  const session = await getSession(db, request);
  if (session) {
    const { slug, responseHeaders } = await resolveOrgRedirect(db, request, session);
    throw redirect(slug ? `/${slug}/dashboard` : "/onboarding", { headers: responseHeaders });
  }
  return null;
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
