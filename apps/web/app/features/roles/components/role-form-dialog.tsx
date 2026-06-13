import { Button } from "@components/ui/button";
import { Dialog, DialogContent } from "@components/ui/dialog";
import { ArrowLeft, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { OrgRole } from "../types";
import { PermissionsEditor } from "./permissions-editor";

interface RoleFormDialogProps {
  role?: OrgRole;
  onClose: () => void;
  onSubmit: (name: string, permissions: Record<string, string[]>) => void;
  isPending: boolean;
}

export function RoleFormDialog({ role, onClose, onSubmit, isPending }: RoleFormDialogProps) {
  const [name, setName] = useState(role?.role ?? "");
  const [permissions, setPermissions] = useState<Record<string, string[]>>(role?.permission ?? {});
  const isEdit = !!role;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (name.trim() && !isPending) {
          onSubmit(name.trim(), permissions);
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [name, permissions, isPending, onSubmit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), permissions);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[580px] p-0 gap-0 rounded-2xl overflow-hidden [&>button]:hidden">
        <div className="flex items-center gap-3 px-7 py-5 border-b border-border/60">
          <button
            type="button"
            onClick={onClose}
            aria-label="Go back"
            className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold leading-tight">
              {isEdit ? "Edit role" : "Create role"}
            </p>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {isEdit ? `Editing "${role.role}"` : "Define a name and permission set."}
            </p>
          </div>
          <kbd className="hidden sm:flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground font-mono select-none">
            <span>⌘</span>
            <span>↵</span>
          </kbd>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form id="role-form" onSubmit={handleSubmit}>
          <div className="px-7 pt-6 pb-5 space-y-5">
            <div>
              <label className="text-sm font-medium block mb-1.5" htmlFor="role-name-input">
                Role name
              </label>
              <input
                id="role-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Support Agent"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                required
                maxLength={64}
                autoFocus
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-3">Permissions</p>
              <PermissionsEditor value={permissions} onChange={setPermissions} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 px-7 py-5 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              className="h-10 px-5 text-[14px]"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              form="role-form"
              type="submit"
              className="h-10 px-5 text-[14px]"
              disabled={isPending || !name.trim()}
            >
              {isPending
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                  ? "Save changes"
                  : "Create role"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
