import { getAuth } from "@lib/auth/server";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { member, organization } from "@/db/schema";

export async function getActiveOrgSlug(db: Db, request: Request): Promise<string | null> {
  const session = await getAuth(db).api.getSession({ headers: request.headers });
  if (!session?.session.activeOrganizationId) return null;

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, session.session.activeOrganizationId),
    columns: { slug: true },
  });

  return org?.slug ?? null;
}

type AuthSession = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>["api"]["getSession"]>>>;

// Resolves which org slug to redirect to on app entry.
// Handles the fresh-login case where activeOrganizationId is not yet set.
// Accepts an already-fetched session to avoid a redundant auth API call.
// Returns the slug AND response headers so callers can forward the Set-Cookie
// from setActiveOrganization — without it the client cookie cache stays stale
// and WorkspaceSwitcher shows "Select workspace" after a fresh login.
export async function resolveOrgRedirect(
  db: Db,
  request: Request,
  session: AuthSession,
): Promise<{ slug: string | null; responseHeaders: Headers }> {
  const emptyHeaders = new Headers();

  if (session.session.activeOrganizationId) {
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, session.session.activeOrganizationId),
      columns: { slug: true },
    });
    return { slug: org?.slug ?? null, responseHeaders: emptyHeaders };
  }

  // Fresh login: activeOrganizationId not set yet — find first membership
  const firstMembership = await db.query.member.findFirst({
    where: eq(member.userId, session.user.id),
    columns: { organizationId: true },
  });

  if (!firstMembership) return { slug: null, responseHeaders: emptyHeaders };

  // Set active org and fetch its slug in parallel.
  // asResponse: true gives us the raw Response so we can forward Set-Cookie.
  const [setActiveResponse, org] = await Promise.all([
    getAuth(db).api.setActiveOrganization({
      body: { organizationId: firstMembership.organizationId },
      headers: request.headers,
      asResponse: true,
    }),
    db.query.organization.findFirst({
      where: eq(organization.id, firstMembership.organizationId),
      columns: { slug: true },
    }),
  ]);

  return { slug: org?.slug ?? null, responseHeaders: setActiveResponse.headers };
}
