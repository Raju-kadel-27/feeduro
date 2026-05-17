import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog";
import type { OrgRole } from "@features/roles/types";
import { authClient } from "@lib/auth/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface Props {
  onClose: () => void;
}

const BUILTIN_ROLES = [
  { value: "admin", label: "Admin", description: "Full control over the workspace" },
  { value: "member", label: "Member", description: "Can create and update feedback" },
  { value: "viewer", label: "Viewer", description: "Read-only access" },
];

export function InviteMemberDialog({ onClose }: Props) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

  const { data: customRoles = [] } = useQuery<OrgRole[]>({
    queryKey: ["org-roles"],
    queryFn: async () => {
      const result = await authClient.organization.listRoles();
      return (result.data ?? []) as OrgRole[];
    },
    staleTime: 30_000,
  });

  const allRoles = [
    ...BUILTIN_ROLES,
    ...customRoles.map((r) => ({ value: r.role, label: r.role, description: "Custom role" })),
  ];

  const { mutate, isPending, error, isSuccess } = useMutation({
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
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    mutate();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b">
          <DialogTitle className="text-base font-semibold">Invite team member</DialogTitle>
        </DialogHeader>

        {isSuccess ? (
          <div className="p-5 space-y-4">
            <div className="flex flex-col items-center text-center py-4 gap-2">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400 text-lg">✓</span>
              </div>
              <p className="font-medium">Invitation sent!</p>
              <p className="text-sm text-muted-foreground">
                An email was sent to <strong>{email}</strong> with an invite link.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="colleague@example.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <div className="space-y-2">
                {allRoles.map((r) => (
                  <label
                    key={r.value}
                    className="flex items-start gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={role === r.value}
                      onChange={() => setRole(r.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">{r.label}</p>
                      <p className="text-xs text-muted-foreground">{r.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {(error as Error).message}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !email.trim()}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isPending ? "Sending…" : "Send invitation"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
