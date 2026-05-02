import { auth } from "@lib/auth/server";
import { and, eq } from "drizzle-orm";
import { redirect } from "react-router";

export { auth };

import { getDb } from "@/db";
import { member, organization } from "@/db/schema";

export async function requireSession(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw redirect("/sign-in");
  return session;
}

export async function requireOrganization(request: Request) {
  const session = await requireSession(request);
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) throw redirect("/onboarding");
  return { session, organizationId };
}

export async function requireOrgBySlug(request: Request, slug: string) {
  const session = await requireSession(request);
  const db = getDb();

  const org = await db.query.organization.findFirst({
    where: eq(organization.slug, slug),
  });

  if (!org) throw new Response("Not found", { status: 404 });

  console.log({ org });

  const membership = await db.query.member.findFirst({
    where: and(eq(member.organizationId, org.id), eq(member.userId, session.user.id)),
  });

  console.log({ membership });

  if (!membership) throw new Response("Not found", { status: 404 });

  return { session, org, organizationId: org.id };
}

export async function getSession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

export async function getActiveOrgSlug(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.session.activeOrganizationId) return null;

  const db = getDb();
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, session.session.activeOrganizationId),
  });

  return org?.slug ?? null;
}
