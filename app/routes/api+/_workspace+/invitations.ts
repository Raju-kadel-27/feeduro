import { auth } from "@/app/lib/auth/server";
import { requireOrganization } from "@features/auth/server/guards";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { getDb } from "@/db";
import { member } from "@/db/schema";

import type { Route } from "./+types/invitations";

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);

  const db = getDb();
  const memberRecord = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
  });

  if (memberRecord?.role !== "admin") {
    return data({ error: "Only admins can manage invitations" }, { status: 403 });
  }

  const body = (await request.json()) as {
    intent: string;
    email?: string;
    role?: string;
    invitationId?: string;
  };

  if (body.intent === "invite") {
    const { email, role = "member" } = body;
    if (!email) return data({ error: "Email required" }, { status: 400 });

    const result = await auth.api.createInvitation({
      headers: request.headers,
      body: { email, role: "member", organizationId },
    });

    return data({ success: true, invitation: result });
  }

  if (body.intent === "cancel") {
    const { invitationId } = body;
    if (!invitationId) return data({ error: "invitationId required" }, { status: 400 });

    await auth.api.cancelInvitation({
      headers: request.headers,
      body: { invitationId },
    });

    return data({ success: true });
  }

  if (body.intent === "remove_member") {
    const { memberId } = body as { intent: string; memberId?: string };
    if (!memberId) return data({ error: "memberId required" }, { status: 400 });

    await auth.api.removeMember({
      headers: request.headers,
      body: { memberIdOrEmail: memberId },
    });

    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);

  const result = await auth.api.getFullOrganization({
    headers: request.headers,
    query: { organizationId },
  });

  return data({ organization: result });
}
