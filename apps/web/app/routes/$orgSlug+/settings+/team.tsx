import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { AppSidebar } from "@features/layout/components/app-sidebar/app-sidebar";
import { InviteMemberDialog } from "@features/workspace/components/invite-member-dialog";
import { auth } from "@lib/auth/server";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { Crown, Mail, UserMinus, X } from "lucide-react";
import { useState } from "react";
import { getDb } from "@/db";
import { invitation } from "@/db/schema";

import type { Route } from "./+types/team";

export function meta() {
  return [{ title: "Team Settings — Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrgBySlug(request, params.orgSlug);

  const [membersResult, pendingInvitations] = await Promise.all([
    auth.api.listMembers({
      headers: request.headers,
      query: { organizationId },
    }),
    getDb().query.invitation.findMany({
      where: and(eq(invitation.organizationId, organizationId), eq(invitation.status, "pending")),
    }),
  ]);

  const orgMembers = membersResult?.members ?? [];

  const currentMember = orgMembers.find((m: { userId: string }) => m.userId === session.user.id);

  return {
    members: orgMembers,
    pendingInvitations,
    currentUserId: session.user.id,
    currentRole: currentMember?.role ?? "member",
    orgSlug: params.orgSlug,
  };
}

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  member: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  viewer: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

interface Member {
  id: string;
  userId: string;
  role: string;
  user?: { name?: string; email: string; image?: string | null };
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string | null;
  expiresAt: Date;
}

export default function TeamSettings({ loaderData }: Route.ComponentProps) {
  const qc = useQueryClient();
  const isAdmin = loaderData.currentRole === "admin";

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const members: Member[] = loaderData.members as Member[];
  const pendingInvitations: PendingInvitation[] =
    loaderData.pendingInvitations as PendingInvitation[];

  const {
    mutate: sendInvite,
    isPending: inviting,
    error: inviteError,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "invite", email, role }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to send invitation");
      return json;
    },
    onSuccess: () => {
      setInviteSuccess(true);
      setEmail("");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
  });

  const { mutate: cancelInvite } = useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "cancel", invitationId }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });

  const { mutate: removeMember } = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "remove_member", memberId }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviteSuccess(false);
    sendInvite();
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">Team</span>
        </header>

        <main className="p-6 max-w-[840px] mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold">Team</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage your team members and their roles.
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer"
              >
                Invite Member
              </button>
            )}
          </div>

          {/* Invite Member Dialog */}
          {showInvite && <InviteMemberDialog onClose={() => setShowInvite(false)} />}

          {/* Pending invitations */}
          {isAdmin && pendingInvitations.length > 0 && (
            <section>
              <h2 className="text-base font-semibold mb-1">Pending invitations</h2>
              <p className="text-sm text-muted-foreground mb-4">
                These users have been invited but haven't accepted yet.
              </p>
              <div className="rounded-lg border divide-y">
                {pendingInvitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{inv.email}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {inv.role ?? "member"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => cancelInvite(inv.id)}
                      title="Cancel invitation"
                      className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Members list */}
          <section>
            <h2 className="text-base font-semibold mb-1">Members</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {members.length} member{members.length !== 1 ? "s" : ""} in this workspace.
            </p>
            <div className="rounded-lg border divide-y">
              {members.map((m) => {
                const name = m.user?.name ?? m.user?.email ?? "Unknown";
                const email = m.user?.email ?? "";
                const isCurrentUser = m.userId === loaderData.currentUserId;

                return (
                  <div key={m.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                        {name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {name}
                          {isCurrentUser && (
                            <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                          )}
                        </p>
                        {name !== email && <p className="text-xs text-muted-foreground">{email}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[m.role] ?? ROLE_BADGE.member}`}
                      >
                        {m.role === "admin" && <Crown className="h-3 w-3" />}
                        {m.role}
                      </span>
                      {isAdmin && !isCurrentUser && (
                        <button
                          type="button"
                          onClick={() => removeMember(m.id)}
                          title="Remove member"
                          className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
