import { requireSession } from "@lib/session";
import { and, eq } from "drizzle-orm";
import { redirect } from "react-router";
import { auth } from "@/app/lib/auth/server";
import { getDb } from "@/db";
import { apikey, member, organization } from "@/db/schema";

export async function requireOrganization(request: Request) {
  const session = await requireSession(request);
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) throw redirect("/onboarding");
  return { session, organizationId };
}

export async function requireAdmin(organizationId: string, userId: string): Promise<void> {
  const db = getDb();
  const membership = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
    columns: { role: true },
  });
  if (!membership || !["admin", "owner"].includes(membership.role)) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export async function requireOrgBySlug(request: Request, slug: string) {
  const session = await requireSession(request);
  const db = getDb();

  const org = await db.query.organization.findFirst({
    where: eq(organization.slug, slug),
    columns: { id: true, slug: true, name: true, logo: true },
  });

  if (!org) throw new Response("Not found", { status: 404 });

  const membership = await db.query.member.findFirst({
    where: and(eq(member.organizationId, org.id), eq(member.userId, session.user.id)),
    columns: { role: true },
  });

  if (!membership) throw new Response("Not found", { status: 404 });

  return { session, org, organizationId: org.id };
}

/** Resolves org from a session cookie OR a Bearer API key. Returns null if unauthenticated. */
export async function resolveApiOrganizationId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session?.session.activeOrganizationId) return session.session.activeOrganizationId;

  const bearer = request.headers.get("Authorization");
  if (bearer?.startsWith("Bearer ")) {
    const token = bearer.slice(7);
    const db = getDb();
    const key = await db.query.apikey.findFirst({
      where: and(eq(apikey.key, token), eq(apikey.enabled, true)),
      columns: { referenceId: true, expiresAt: true },
    });
    if (key && (!key.expiresAt || key.expiresAt > new Date())) return key.referenceId;
  }

  return null;
}
