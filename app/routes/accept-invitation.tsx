import { authClient } from "@lib/auth/client";
import { getSession } from "@lib/session.server";
import { eq } from "drizzle-orm";
import { redirect } from "react-router";
import { getDb } from "@/db";
import { invitation, organization, user } from "@/db/schema";
import type { Route } from "./+types/accept-invitation";

export function meta() {
  return [{ title: "Accept Invitation — Feediyo" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const invitationId = url.searchParams.get("invitationId");
  if (!invitationId) {
    throw new Response("Invalid invitation link", { status: 400 });
  }

  const session = await getSession(request);
  if (!session) {
    const returnTo = encodeURIComponent(`/accept-invitation?invitationId=${invitationId}`);
    throw redirect(`/sign-in?redirect=${returnTo}`);
  }

  const db = getDb();
  const row = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      orgName: organization.name,
      inviterName: user.name,
      inviterEmail: user.email,
    })
    .from(invitation)
    .innerJoin(organization, eq(invitation.organizationId, organization.id))
    .innerJoin(user, eq(invitation.inviterId, user.id))
    .where(eq(invitation.id, invitationId))
    .then((r) => r[0] ?? null);

  if (!row) {
    throw new Response("Invitation not found or expired", { status: 404 });
  }

  if (row.status !== "pending" || row.expiresAt < new Date()) {
    throw new Response("Invitation has expired or already been used", { status: 410 });
  }

  const emailMismatch = session.user.email !== row.email;

  return {
    invitationId,
    invitedEmail: row.email,
    role: row.role ?? "member",
    orgName: row.orgName,
    inviterName: row.inviterName,
    inviterEmail: row.inviterEmail,
    emailMismatch,
    currentEmail: session.user.email,
  };
}

export default function AcceptInvitation({ loaderData }: Route.ComponentProps) {
  const {
    invitationId,
    invitedEmail,
    role,
    orgName,
    inviterName,
    inviterEmail,
    emailMismatch,
    currentEmail,
  } = loaderData;

  async function handleAccept() {
    const { data, error } = await authClient.organization.acceptInvitation({
      invitationId,
    });
    if (error) {
      alert(error.message ?? "Failed to accept invitation");
      return;
    }
    if (data?.invitation.organizationId) {
      await authClient.organization.setActive({
        organizationId: data.invitation.organizationId,
      });
    }
    window.location.href = "/dashboard";
  }

  async function handleReject() {
    await authClient.organization.rejectInvitation({ invitationId });
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-xl border shadow-sm text-center">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <span className="text-xl font-bold text-primary-foreground">F</span>
          </div>
        </div>

        {emailMismatch ? (
          <div className="space-y-3">
            <h1 className="text-xl font-bold">Wrong account</h1>
            <p className="text-sm text-muted-foreground">
              This invitation was sent to{" "}
              <strong className="text-foreground">{invitedEmail}</strong>, but you're signed in as{" "}
              <strong className="text-foreground">{currentEmail}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Sign out and sign in with the invited email to continue.
            </p>
            <button
              type="button"
              onClick={async () => {
                await authClient.signOut();
                const returnTo = encodeURIComponent(
                  `/accept-invitation?invitationId=${invitationId}`,
                );
                window.location.href = `/sign-in?redirect=${returnTo}`;
              }}
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Sign out & switch account
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h1 className="text-xl font-bold">You're invited!</h1>
              <p className="text-sm text-muted-foreground">
                <strong>{inviterName ?? inviterEmail}</strong> has invited you to join{" "}
                <strong>{orgName}</strong> as a <strong>{role}</strong>.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleReject}
                className="flex-1 py-2 px-4 border rounded-md text-sm font-medium hover:bg-muted transition-colors"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={handleAccept}
                className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Accept invitation
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              By accepting, you'll join the workspace and can be seen by other members.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
