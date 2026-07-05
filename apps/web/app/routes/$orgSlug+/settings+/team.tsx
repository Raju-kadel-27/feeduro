import { PageHeader } from "@components/common/page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/ui/tooltip";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { InviteMemberDialog } from "@features/internal/workspace/components/invite-member-dialog";
import { getAuth } from "@lib/auth/server";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { Crown, Mail, Plus, UserMinus, Users, X } from "lucide-react";
import { useState } from "react";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { invitation } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/team";

export function meta() {
  return [{ title: "Team Settings — Feeduro" }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

  const [membersResult, pendingInvitations] = await Promise.all([
    getAuth(db).api.listMembers({
      headers: request.headers,
      query: { organizationId },
    }),
    db.query.invitation.findMany({
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
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<Member | null>(null);

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

  const { mutate: removeMember, isPending: removing } = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "remove_member", memberId }),
      });
      return res.json();
    },
    onSuccess: () => {
      setConfirmRemoveMember(null);
      qc.invalidateQueries({ queryKey: ["team"] });
    },
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviteSuccess(false);
    sendInvite();
  };

  return (
    <>
        <header className="flex h-14 shrink-0 items-center px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
          <PageHeader
            title="Team"
            icon={Users}
            action={isAdmin ? (
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Invite Member
              </button>
            ) : undefined}
          />

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
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-400 dark:ring-yellow-400/20">
                        Pending
                      </span>
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => cancelInvite(inv.id)}
                              className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Cancel invitation</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
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
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => setConfirmRemoveMember(m)}
                                className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                              >
                                <UserMinus className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Remove member</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>

        <Dialog
          open={!!confirmRemoveMember}
          onOpenChange={(open) => { if (!open) setConfirmRemoveMember(null); }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Remove member</DialogTitle>
              <DialogDescription>
                Remove <strong>{confirmRemoveMember?.user?.name ?? confirmRemoveMember?.user?.email}</strong> from this workspace? They will lose access immediately.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setConfirmRemoveMember(null)}
                className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmRemoveMember && removeMember(confirmRemoveMember.id)}
                disabled={removing}
                className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                {removing ? "Removing…" : "Remove"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </>
  );
}
