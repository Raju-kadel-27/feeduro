import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog";
import { useEffect, useState } from "react";

export function CreateLinearIssueModal({
  open,
  defaultTitle,
  defaultDescription,
  onClose,
  onSubmit,
  creating,
}: {
  open: boolean;
  defaultTitle: string;
  defaultDescription: string;
  onClose: () => void;
  onSubmit: (params: { title: string; description: string }) => void;
  creating: boolean;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);

  useEffect(() => {
    if (!open) return;
    setTitle(defaultTitle);
    setDescription(defaultDescription);
  }, [open, defaultTitle, defaultDescription]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ title: title.trim(), description: description.trim() });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md z-[60]">
        <DialogHeader>
          <DialogTitle className="text-base">Create a new Linear issue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full h-8 px-2.5 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full px-2.5 py-2 text-xs border rounded bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={creating || !title.trim()}
              className="px-4 py-2 text-xs font-semibold rounded bg-[#5E6AD2] text-white hover:bg-[#5E6AD2]/90 disabled:opacity-50 uppercase tracking-wide transition-colors"
            >
              {creating ? "Creating…" : "Create & Link Issue"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
