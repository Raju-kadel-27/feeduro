import { auth } from "@lib/auth/server";
import { getSession } from "@lib/session.server";
import { eq } from "drizzle-orm";
import { redirect } from "react-router";
import { getDb } from "@/db";
import { member, organization } from "@/db/schema";

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request);

  if (!session) {
    throw redirect("/sign-in");
  }

  if (session.session.activeOrganizationId) {
    const db = getDb();
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, session.session.activeOrganizationId),
    });
    throw redirect(org?.slug ? `/${org.slug}/dashboard` : "/onboarding");
  }

  // activeOrganizationId is null on every fresh login — check for existing memberships
  const db = getDb();
  const memberships = await db.query.member.findMany({
    where: eq(member.userId, session.user.id),
  });

  if (memberships.length === 0) {
    throw redirect("/onboarding");
  }

  // User already has an org — set it active and go to its dashboard
  const firstOrgId = memberships[0].organizationId;

  await auth.api.setActiveOrganization({
    body: { organizationId: firstOrgId },
    headers: request.headers,
  });

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, firstOrgId),
  });

  throw redirect(org?.slug ? `/${org.slug}/dashboard` : "/onboarding");
}
