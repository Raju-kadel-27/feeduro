import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { RESOURCE_DEFINITIONS } from "../constants";
import type { OrgRole } from "../types";
import { EditRoleDialog } from "./edit-role-dialog";

interface RolesTableProps {
  roles: OrgRole[];
  isAdmin: boolean;
  onDelete: (roleId: string) => void;
  onUpdate: (roleId: string, name: string, permissions: Record<string, string[]>) => void;
  isPendingDelete: boolean;
  isPendingUpdate: boolean;
}

function PermissionBadges({ permission }: { permission: Record<string, string[]> }) {
  const badges: string[] = [];
  for (const res of RESOURCE_DEFINITIONS) {
    const perms = permission[res.key] ?? [];
    for (const perm of perms) {
      const label = res.permissions.find((p) => p.value === perm)?.label ?? perm;
      badges.push(`${res.label}: ${label}`);
    }
  }
  if (badges.length === 0) return <span className="text-xs text-muted-foreground">No permissions</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {badges.slice(0, 6).map((b) => (
        <span key={b} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          {b}
        </span>
      ))}
      {badges.length > 6 && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          +{badges.length - 6} more
        </span>
      )}
    </div>
  );
}

export function RolesTable({
  roles,
  isAdmin,
  onDelete,
  onUpdate,
  isPendingDelete,
  isPendingUpdate,
}: RolesTableProps) {
  const [editingRole, setEditingRole] = useState<OrgRole | null>(null);

  if (roles.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No custom roles yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border divide-y">
        {roles.map((role) => (
          <div key={role.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-1.5">{role.role}</p>
                <PermissionBadges permission={role.permission ?? {}} />
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingRole(role)}
                    className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                    title="Edit role"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(role.id)}
                    disabled={isPendingDelete}
                    className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground disabled:opacity-50"
                    title="Delete role"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {editingRole && (
        <EditRoleDialog
          role={editingRole}
          onClose={() => setEditingRole(null)}
          onSubmit={(roleId, name, permissions) => {
            onUpdate(roleId, name, permissions);
            setEditingRole(null);
          }}
          isPending={isPendingUpdate}
        />
      )}
    </>
  );
}
