import { Button } from "@components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { FeedbackTag } from "./types";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#3b82f6", "#ec4899", "#14b8a6"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: (tag: FeedbackTag) => void;
}

async function callApi(url: string, body: object) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

export function NewTagDialog({ open, onOpenChange, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  function reset() { setName(""); setColor(COLORS[0]); }

  const { mutate, isPending } = useMutation({
    mutationFn: () => callApi("/api/tags", { intent: "create", name, color }),
    onSuccess: (data) => {
      const d = data as { tag?: FeedbackTag };
      if (d.tag) onSuccess(d.tag);
      toast.success("Tag created");
      onOpenChange(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Tag</DialogTitle>
        </DialogHeader>
        <form id="new-tag-form" onSubmit={(e) => { e.preventDefault(); mutate(); }} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bug" required maxLength={50} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Color</label>
            <div className="flex gap-1.5 flex-wrap">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110" style={{ backgroundColor: c, borderColor: color === c ? "#fff" : "transparent", outline: color === c ? `2px solid ${c}` : "none" }} aria-label={c} />
              ))}
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="new-tag-form" disabled={isPending || !name.trim()}>
            {isPending ? "Creating…" : "Create tag"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
