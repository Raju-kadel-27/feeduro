import { CreateWorkspaceForm } from "@features/workspace/components/create-workspace-form";
import { auth } from "@/app/lib/auth/server";
import { requireSession } from "@lib/session";
import { eq } from "drizzle-orm";
import { redirect } from "react-router";
import { getDb } from "@/db";
import { member, organization } from "@/db/schema";

import type { Route } from "./+types/onboarding";

export function meta() {
  return [{ title: "Create your workspace — Feediyo" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireSession(request);

  // Already has an active org
  if (session.session.activeOrganizationId) {
    const db = getDb();
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, session.session.activeOrganizationId),
    });
    throw redirect(org?.slug ? `/${org.slug}/dashboard` : "/");
  }

  // Has orgs but none active (e.g. after sign-in) — set first one active
  const db = getDb();
  const memberships = await db.query.member.findMany({
    where: eq(member.userId, session.user.id),
  });

  if (memberships.length > 0 && memberships[0]) {
    const firstOrgId = memberships[0].organizationId;
    await auth.api.setActiveOrganization({
      body: { organizationId: firstOrgId },
      headers: request.headers,
    });
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, firstOrgId),
    });
    throw redirect(org?.slug ? `/${org.slug}/dashboard` : "/");
  }

  return { user: session.user };
}

export default function Onboarding() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-lg p-8 space-y-8 bg-card rounded-xl border shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Create your workspace</h1>
          <p className="text-sm text-muted-foreground">
            A workspace is where your team collects and manages product feedback.
          </p>
        </div>
        <CreateWorkspaceForm autoFocus />
      </div>
    </div>
  );
}
