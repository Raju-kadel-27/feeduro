import { SidebarTrigger } from "@components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/ui/tooltip";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { getAuth } from "@lib/auth/server";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, UserMinus } from "lucide-react";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/members";

export function meta() {
  return [{ title: "Members — Feeduro" }];
}

export function shouldRevalidate({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}: Route.ShouldRevalidateArgs) {
  if (currentUrl.pathname === nextUrl.pathname) return false;
  return defaultShouldRevalidate;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

  const auth = getAuth(db);
  const [membersResult, org] = await Promise.all([
    auth.api.listMembers({
      headers: request.headers,
      query: { organizationId },
    }),
    auth.api.getFullOrganization({
      headers: request.headers,
      query: { organizationId },
    }),
  ]);

  const orgMembers = membersResult?.members ?? [];

  const currentMember = orgMembers.find((m: { userId: string }) => m.userId === session.user.id);

  return {
    members: orgMembers,
    organization: org,
    currentUserId: session.user.id,
    currentRole: currentMember?.role ?? "member",
  };
}

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

export default function Members({ loaderData }: Route.ComponentProps) {
  const qc = useQueryClient();
  const isAdmin = loaderData.currentRole === "admin";

  const { mutate: removeMember } = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "remove_member", memberId }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });

  const members: Member[] = loaderData.members as Member[];

  return (
        <>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="p-6 max-w-3xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold">Members</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {members.length} member{members.length !== 1 ? "s" : ""} in this workspace
              </p>
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Member</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                  {isAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const name = m.user?.name ?? m.user?.email ?? "Unknown";
                  const email = m.user?.email ?? "";
                  const isCurrentUser = m.userId === loaderData.currentUserId;

                  return (
                    <tr key={m.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                            {name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">
                              {name}
                              {isCurrentUser && (
                                <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                              )}
                            </p>
                            {name !== email && (
                              <p className="text-xs text-muted-foreground">{email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[m.role] ?? ROLE_BADGE.member}`}
                        >
                          {m.role === "admin" && <Crown className="h-3 w-3" />}
                          {m.role}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          {!isCurrentUser && (
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => removeMember(m.id)}
                                    className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                                  >
                                    <UserMinus className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Remove member</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
        </>
  );
}
