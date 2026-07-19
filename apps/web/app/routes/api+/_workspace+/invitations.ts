import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import { logOrgActivity } from "@features/internal/audit/server/log-org-activity";
import { getAuth } from "@lib/auth/server";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { z } from "zod";
import { organizationRole } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/invitations";

const BUILTIN_ROLES = ["admin", "member", "viewer"] as const;

const InvitationsActionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("invite"),
    email: z.string().email("Invalid email address"),
    role: z.string().min(1).optional().default("member"),
  }),
  z.object({
    intent: z.literal("cancel"),
    invitationId: z.string().min(1, "invitationId is required"),
  }),
  z.object({
    intent: z.literal("remove_member"),
    memberId: z.string().min(1, "memberId is required"),
  }),
]);

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return data({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = InvitationsActionSchema.safeParse(rawBody);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Invalid request";
    return data({ error: message }, { status: 400 });
  }

  const body = parsed.data;

  if (body.intent === "invite") {
    await requirePermission(db, organizationId, session.user.id, { invitation: ["create"] });

    const role = body.role;

    // Validate role: must be a known built-in or an existing custom role for this org.
    if (!(BUILTIN_ROLES as readonly string[]).includes(role)) {
      const customRole = await db.query.organizationRole.findFirst({
        where: and(eq(organizationRole.organizationId, organizationId), eq(organizationRole.role, role)),
        columns: { role: true },
      });
      if (!customRole) {
        return data({ error: `Unknown role "${role}"` }, { status: 400 });
      }
    }

    // Privilege escalation guard: only members with member:create permission (admins)
    // can invite someone as admin. Regular members with invitation:create cannot.
    if (role === "admin") {
      await requirePermission(db, organizationId, session.user.id, { member: ["create"] });
    }

    const result = await getAuth(db).api.createInvitation({
      headers: request.headers,
      body: { email: body.email, role, organizationId },
    });
    await logOrgActivity(db, {
      orgId: organizationId,
      actor: { id: session.user.id, email: session.user.email, name: session.user.name },
      action: "member_invited",
      target: { type: "invitation" },
      metadata: { email: body.email, role },
      request,
    });
    return data({ success: true, invitation: result });
  }

  if (body.intent === "cancel") {
    await requirePermission(db, organizationId, session.user.id, { invitation: ["cancel"] });

    await getAuth(db).api.cancelInvitation({
      headers: request.headers,
      body: { invitationId: body.invitationId },
    });
    await logOrgActivity(db, {
      orgId: organizationId,
      actor: { id: session.user.id, email: session.user.email, name: session.user.name },
      action: "invitation_cancelled",
      target: { type: "invitation", id: body.invitationId },
      request,
    });
    return data({ success: true });
  }

  // remove_member
  await requirePermission(db, organizationId, session.user.id, { member: ["delete"] });

  await getAuth(db).api.removeMember({
    headers: request.headers,
    body: { memberIdOrEmail: body.memberId },
  });
  await logOrgActivity(db, {
    orgId: organizationId,
    actor: { id: session.user.id, email: session.user.email, name: session.user.name },
    action: "member_removed",
    target: { type: "member", id: body.memberId },
    request,
  });
  return data({ success: true });
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);

  const result = await getAuth(db).api.getFullOrganization({
    headers: request.headers,
    query: { organizationId },
  });

  return data({ organization: result });
}
