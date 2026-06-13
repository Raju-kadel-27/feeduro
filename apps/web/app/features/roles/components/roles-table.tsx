import { Button } from "@components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { RESOURCE_DEFINITIONS } from "../constants";
import type { OrgRole } from "../types";
import { RoleFormDialog } from "./role-form-dialog";

interface RolesTableProps {
  roles: OrgRole[];
  isAdmin: boolean;
  onDelete: (roleId: string) => void;
  onUpdate: (roleId: string, name: string, permissions: Record<string, string[]>) => void;
  deletingRoleId?: string;
  isPendingUpdate: boolean;
  onCreateClick?: () => void;
}

function PermissionSummary({ permission }: { permission: Record<string, string[]> }) {
  const granted = RESOURCE_DEFINITIONS.filter((res) => (permission[res.key] ?? []).length > 0);

  if (granted.length === 0) {
    return <span className="text-xs text-muted-foreground">No permissions</span>;
  }

  const totalCount = granted.reduce((sum, res) => sum + (permission[res.key] ?? []).length, 0);

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1">
      {granted.map((res) => (
        <span
          key={res.key}
          className="text-xs px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50"
        >
          {res.label} ({(permission[res.key] ?? []).length})
        </span>
      ))}
      <span className="text-xs text-muted-foreground/60">
        · {totalCount} permission{totalCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

export function RolesTable({
  roles,
  isAdmin,
  onDelete,
  onUpdate,
  deletingRoleId,
  isPendingUpdate,
  onCreateClick,
}: RolesTableProps) {
  const [editingRole, setEditingRole] = useState<OrgRole | null>(null);
  const [confirmDeleteRole, setConfirmDeleteRole] = useState<OrgRole | null>(null);

  if (roles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 flex flex-col items-center gap-3 text-center">
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No custom roles yet</p>
        <p className="text-xs text-muted-foreground max-w-[280px]">
          Custom roles let you grant team members precise access beyond the built-in admin, member,
          and viewer levels.
        </p>
        {isAdmin && onCreateClick && (
          <Button variant="outline" size="sm" onClick={onCreateClick} className="mt-1 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Create first role
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border divide-y">
        {roles.map((role) => {
          const isDeleting = deletingRoleId === role.id;
          return (
            <div key={role.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{role.role}</p>
                  <PermissionSummary permission={role.permission ?? {}} />
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingRole(role)}
                      aria-label={`Edit ${role.role} role`}
                      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteRole(role)}
                      disabled={isDeleting}
                      aria-label={`Delete ${role.role} role`}
                      className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin block" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingRole && (
        <RoleFormDialog
          role={editingRole}
          onClose={() => setEditingRole(null)}
          onSubmit={(name, permissions) => {
            onUpdate(editingRole.id, name, permissions);
            setEditingRole(null);
          }}
          isPending={isPendingUpdate}
        />
      )}

      {confirmDeleteRole && (
        <Dialog open onOpenChange={(open) => !open && setConfirmDeleteRole(null)}>
          <DialogContent className="max-w-[420px] p-0 gap-0 rounded-2xl overflow-hidden [&>button]:hidden">
            <DialogHeader className="px-7 pt-7 pb-4">
              <DialogTitle className="text-base font-semibold">
                Delete "{confirmDeleteRole.role}"?
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1.5">
                Members assigned this role will lose their custom permissions immediately. This
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end gap-2.5 px-7 py-5 border-t border-border/60">
              <Button
                variant="outline"
                className="h-10 px-5 text-[14px]"
                onClick={() => setConfirmDeleteRole(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="h-10 px-5 text-[14px]"
                onClick={() => {
                  onDelete(confirmDeleteRole.id);
                  setConfirmDeleteRole(null);
                }}
              >
                Delete role
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
