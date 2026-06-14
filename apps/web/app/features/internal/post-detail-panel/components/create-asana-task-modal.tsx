import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog";
import { useEffect, useState } from "react";

export function CreateAsanaTaskModal({
  open,
  defaultName,
  defaultNotes,
  onClose,
  onSubmit,
  creating,
}: {
  open: boolean;
  defaultName: string;
  defaultNotes: string;
  onClose: () => void;
  onSubmit: (params: { name: string; notes: string }) => void;
  creating: boolean;
}) {
  const [name, setName] = useState(defaultName);
  const [notes, setNotes] = useState(defaultNotes);

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setNotes(defaultNotes);
  }, [open, defaultName, defaultNotes]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name: name.trim(), notes: notes.trim() });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md z-[60]">
        <DialogHeader>
          <DialogTitle className="text-base">Create a new Asana task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Task Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full h-8 px-2.5 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="w-full px-2.5 py-2 text-xs border rounded bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="px-4 py-2 text-xs font-semibold rounded bg-[#F06A6A] text-white hover:bg-[#F06A6A]/90 disabled:opacity-50 uppercase tracking-wide transition-colors"
            >
              {creating ? "Creating…" : "Create & Link Task"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
