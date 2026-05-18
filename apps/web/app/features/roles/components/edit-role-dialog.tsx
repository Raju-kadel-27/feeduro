import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog";
import { useState } from "react";
import type { OrgRole } from "../types";
import { PermissionsEditor } from "./permissions-editor";

interface EditRoleDialogProps {
  role: OrgRole;
  onClose: () => void;
  onSubmit: (roleId: string, name: string, permissions: Record<string, string[]>) => void;
  isPending: boolean;
}

export function EditRoleDialog({ role, onClose, onSubmit, isPending }: EditRoleDialogProps) {
  const [name, setName] = useState(role.role);
  const [permissions, setPermissions] = useState<Record<string, string[]>>(role.permission ?? {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(role.id, name.trim(), permissions);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div>
            <label className="text-sm font-medium block mb-1.5" htmlFor="edit-role-name">
              Role name
            </label>
            <input
              id="edit-role-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              required
              maxLength={64}
            />
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Permissions</p>
            <PermissionsEditor value={permissions} onChange={setPermissions} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
