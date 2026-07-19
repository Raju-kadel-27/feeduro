import { getAuth } from "@lib/auth/server";
import { ac, adminRole, memberRole, viewerRole } from "@lib/auth/server/permissions";
import { requireSession } from "@lib/session";
import { and, eq } from "drizzle-orm";
import { redirect } from "react-router";
import type { Db } from "@/db";
import { apikey, member, organization, organizationRole } from "@/db/schema";
import { getRequestContext } from "~/middleware/cloudflare.server";

export async function requireOrganization(db: Db, request: Request) {
  const session = await requireSession(db, request);
  // activeOrganizationId is added by the organization plugin at runtime but
  // TypeScript loses the augmentation when the plugin is wrapped in a factory.
  const { activeOrganizationId } = session.session as typeof session.session & {
    activeOrganizationId?: string | null;
  };
  if (!activeOrganizationId) throw redirect("/onboarding");
  return { session, organizationId: activeOrganizationId };
}

export async function requireAdmin(db: Db, organizationId: string, userId: string): Promise<void> {
  const membership = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
    columns: { role: true },
  });
  if (!membership || membership.role !== "admin") {
    throw new Response("Forbidden", { status: 403 });
  }
}

type OrgShape = { id: string; slug: string; name: string; logo: string | null };

async function loadOrgBySlug(db: Db, request: Request, slug: string) {
  // The session normally resolves from the signed cookie cache without touching
  // the DB, so await it first and fold the org lookup + membership check into
  // one joined query — serial DB depth drops from 2 roundtrips to 1.
  const session = await requireSession(db, request);

  const reqCtx = getRequestContext(db);
  const { kv, ctx } = reqCtx ?? {};

  // KV fast path: key encodes userId so a hit implies past membership verification.
  // TTL 300s — revoked membership stays valid up to 5 min, acceptable tradeoff.
  if (kv) {
    try {
      const cached = await kv.get<OrgShape>(`org:${session.user.id}:${slug}`, "json");
      if (cached) return { session, org: cached, organizationId: cached.id };
    } catch {
      // KV unavailable — fall through to DB
    }
  }

  const [org] = await db
    .select({
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      logo: organization.logo,
    })
    .from(organization)
    .innerJoin(
      member,
      and(eq(member.organizationId, organization.id), eq(member.userId, session.user.id)),
    )
    .where(eq(organization.slug, slug))
    .limit(1);

  // Unknown org and org-without-membership both 404, same as before.
  if (!org) throw new Response("Not found", { status: 404 });

  // Write-through: fire-and-forget so it doesn't block the response.
  if (kv && ctx) {
    ctx.waitUntil(
      kv
        .put(`org:${session.user.id}:${slug}`, JSON.stringify(org), { expirationTtl: 300 })
        .catch(() => {}),
    );
  }

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
  const s = session?.session as ({ activeOrganizationId?: string | null } & Record<string, unknown>) | undefined;
  if (s?.activeOrganizationId) return s.activeOrganizationId;

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
  if (!record) {
    // Role was deleted without reassigning this member. Fall back to member
    // permissions so the user isn't silently locked out of everything.
    console.warn(
      `[permission] member ${userId} in org ${organizationId} has unresolvable role "${membership.role}" — falling back to member`,
    );
    return memberRole;
  }

  let parsed: Record<string, string[]>;
  try {
    parsed = JSON.parse(record.permission as string) as Record<string, string[]>;
  } catch {
    console.error(
      `[permission] malformed JSON for role "${membership.role}" in org ${organizationId} — falling back to member`,
    );
    return memberRole;
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
