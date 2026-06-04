import { requireOrganization } from "@features/auth/server/guards";
import { logOrgActivity } from "@features/audit/server/log-org-activity";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { z } from "zod";
import { auth } from "@/app/lib/auth/server";
import { getDb } from "@/db";
import { member } from "@/db/schema";

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

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);

  const db = getDb();
  const memberRecord = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
  });

  if (memberRecord?.role !== "admin") {
    return data({ error: "Only admins can manage invitations" }, { status: 403 });
  }

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
    const result = await auth.api.createInvitation({
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
    await auth.api.cancelInvitation({
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

  await auth.api.removeMember({
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

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);

  const result = await auth.api.getFullOrganization({
    headers: request.headers,
    query: { organizationId },
  });

  return data({ organization: result });
}
