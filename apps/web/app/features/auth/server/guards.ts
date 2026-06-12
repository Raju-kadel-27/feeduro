import { ac, adminRole, memberRole, viewerRole } from "@lib/auth/server/permissions";
import { requireSession } from "@lib/session";
import { and, eq } from "drizzle-orm";
import { redirect } from "react-router";
import { auth } from "@/app/lib/auth/server";
import { getDb } from "@/db";
import { apikey, member, organization, organizationRole } from "@/db/schema";

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

// ---------------------------------------------------------------------------
// Dynamic permission resolution
// ---------------------------------------------------------------------------

type AcRole = ReturnType<typeof ac.newRole>;

const BUILT_IN_ROLES: Record<string, AcRole> = {
  admin: adminRole,
  member: memberRole,
  viewer: viewerRole,
};

/**
 * Resolves the effective AC role for a user in an org.
 * For built-in roles (admin/member/viewer) this is instant — no extra DB query.
 * For custom roles the permission JSON is loaded from the organizationRole table.
 * Both the member record and custom role rows are fetched in a single Promise.all.
 */
async function resolveAcRole(organizationId: string, userId: string): Promise<AcRole | null> {
  const db = getDb();

  const [membership, customRoles] = await Promise.all([
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
      columns: { role: true },
    }),
    db.query.organizationRole.findMany({
      where: eq(organizationRole.organizationId, organizationId),
      columns: { role: true, permission: true },
    }),
  ]);

  if (!membership) return null;

  const builtIn = BUILT_IN_ROLES[membership.role];
  if (builtIn) return builtIn;

  const record = customRoles.find((r) => r.role === membership.role);
  if (!record) return null;

  let parsed: Record<string, string[]>;
  try {
    parsed = JSON.parse(record.permission as string) as Record<string, string[]>;
  } catch {
    console.error(
      `[permission] malformed JSON for role "${membership.role}" in org ${organizationId}`,
    );
    return null;
  }

  // ac.newRole() is typed for statically-known keys; dynamic JSON requires the cast.
  return ac.newRole(parsed as never);
}

/**
 * Throws a 403 Response if the user does not have all the specified permissions.
 *
 * Usage:
 *   await requirePermission(organizationId, session.user.id, { board: ["create"] });
 *   await requirePermission(organizationId, session.user.id, { changelog: ["publish"] });
 */
export async function requirePermission(
  organizationId: string,
  userId: string,
  permissions: Record<string, string[]>,
): Promise<void> {
  const role = await resolveAcRole(organizationId, userId);
  if (!role || !role.authorize(permissions as never).success) {
    throw new Response("Forbidden", { status: 403 });
  }
}

/**
 * Returns true if the user has all the specified permissions — does not throw.
 * Use this for conditional branching (e.g. "can this user delete someone else's comment?").
 */
export async function canDo(
  organizationId: string,
  userId: string,
  permissions: Record<string, string[]>,
): Promise<boolean> {
  const role = await resolveAcRole(organizationId, userId);
  if (!role) return false;
  return role.authorize(permissions as never).success;
}
