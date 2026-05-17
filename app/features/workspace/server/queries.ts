import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { member, organization } from "@/db/schema";
import { auth } from "@lib/auth/server";

export async function getActiveOrgSlug(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.session.activeOrganizationId) return null;

  const db = getDb();
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, session.session.activeOrganizationId),
    columns: { slug: true },
  });

  return org?.slug ?? null;
}

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

// Resolves which org slug to redirect to on app entry.
// Handles the fresh-login case where activeOrganizationId is not yet set.
// Accepts an already-fetched session to avoid a redundant auth API call.
export async function resolveOrgRedirect(request: Request, session: AuthSession): Promise<string | null> {
  const db = getDb();

  if (session.session.activeOrganizationId) {
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, session.session.activeOrganizationId),
      columns: { slug: true },
    });
    return org?.slug ?? null;
  }

  // Fresh login: activeOrganizationId not set yet — find first membership
  const firstMembership = await db.query.member.findFirst({
    where: eq(member.userId, session.user.id),
    columns: { organizationId: true },
  });

  if (!firstMembership) return null;

  // Set active org and fetch its slug in parallel
  const [, org] = await Promise.all([
    auth.api.setActiveOrganization({
      body: { organizationId: firstMembership.organizationId },
      headers: request.headers,
    }),
    db.query.organization.findFirst({
      where: eq(organization.id, firstMembership.organizationId),
      columns: { slug: true },
    }),
  ]);

  return org?.slug ?? null;
}
