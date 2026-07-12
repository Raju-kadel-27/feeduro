import { getAuth } from "@lib/auth/server";
import { ac, adminRole, memberRole, viewerRole } from "@lib/auth/server/permissions";
import { requireSession } from "@lib/session";
import { and, eq } from "drizzle-orm";
import { redirect } from "react-router";
import type { Db } from "@/db";
import { apikey, member, organization, organizationRole } from "@/db/schema";

export async function requireOrganization(db: Db, request: Request) {
  const session = await requireSession(db, request);
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) throw redirect("/onboarding");
  return { session, organizationId };
}

export async function requireAdmin(db: Db, organizationId: string, userId: string): Promise<void> {
  const membership = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
    columns: { role: true },
  });
  if (!membership || !["admin", "owner"].includes(membership.role)) {
    throw new Response("Forbidden", { status: 403 });
  }
}

async function loadOrgBySlug(db: Db, request: Request, slug: string) {
  // Session comes from the cookie and the org lookup only needs the slug — run
  // them concurrently instead of paying two sequential DB roundtrips.
  const [session, org] = await Promise.all([
    requireSession(db, request),
    db.query.organization.findFirst({
      where: eq(organization.slug, slug),
      columns: { id: true, slug: true, name: true, logo: true },
    }),
  ]);

  if (!org) throw new Response("Not found", { status: 404 });

  const membership = await db.query.member.findFirst({
    where: and(eq(member.organizationId, org.id), eq(member.userId, session.user.id)),
    columns: { role: true },
  });

  if (!membership) throw new Response("Not found", { status: 404 });

  return { session, org, organizationId: org.id };
}

// The db client is created per request, so keying on it scopes this cache to a
// single request. Layout and leaf loaders run in the same single-fetch request
// and both guard with requireOrgBySlug — memoizing runs the lookups once.
const orgBySlugCache = new WeakMap<Db, Map<string, ReturnType<typeof loadOrgBySlug>>>();

export function requireOrgBySlug(db: Db, request: Request, slug: string) {
  let bySlug = orgBySlugCache.get(db);
  if (!bySlug) {
    bySlug = new Map();
    orgBySlugCache.set(db, bySlug);
  }
  let result = bySlug.get(slug);
  if (!result) {
    result = loadOrgBySlug(db, request, slug);
    bySlug.set(slug, result);
  }
  return result;
}

/** Resolves org from a session cookie OR a Bearer API key. Returns null if unauthenticated. */
export async function resolveApiOrganizationId(db: Db, request: Request): Promise<string | null> {
  const session = await getAuth(db).api.getSession({ headers: request.headers });
  if (session?.session.activeOrganizationId) return session.session.activeOrganizationId;

  const bearer = request.headers.get("Authorization");
  if (bearer?.startsWith("Bearer ")) {
    const token = bearer.slice(7);
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

async function resolveAcRole(
  db: Db,
  organizationId: string,
  userId: string,
): Promise<AcRole | null> {
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

  return ac.newRole(parsed as never);
}

export async function requirePermission(
  db: Db,
  organizationId: string,
  userId: string,
  permissions: Record<string, string[]>,
): Promise<void> {
  const role = await resolveAcRole(db, organizationId, userId);
  if (!role || !role.authorize(permissions as never).success) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export async function canDo(
  db: Db,
  organizationId: string,
  userId: string,
  permissions: Record<string, string[]>,
): Promise<boolean> {
  const role = await resolveAcRole(db, organizationId, userId);
  if (!role) return false;
  return role.authorize(permissions as never).success;
}
