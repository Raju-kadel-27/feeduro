import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import { logOrgActivity } from "@features/internal/audit/server/log-org-activity";
import { getAuth } from "@lib/auth/server";
import { data } from "react-router";
import { z } from "zod";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/invitations";

const InvitationsActionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("invite"),
    email: z.string().email("Invalid email address"),
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

    const result = await getAuth(db).api.createInvitation({
      headers: request.headers,
      body: { email: body.email, role: "member", organizationId },
    });
    await logOrgActivity({
      orgId: organizationId,
      actor: { id: session.user.id, email: session.user.email, name: session.user.name },
      action: "member_invited",
      target: { type: "invitation" },
      metadata: { email: body.email, role: "member" },
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
    await logOrgActivity({
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
  await logOrgActivity({
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
