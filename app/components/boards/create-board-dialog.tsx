import { cn } from "@lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Lock, X } from "lucide-react";
import { useState } from "react";

interface Props {
  onClose: () => void;
  onCreated?: (slug: string) => void;
}

export function CreateBoardDialog({ onClose, onCreated }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  const { mutate, isPending, error } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create", name, description, visibility }),
      });
      const json = (await res.json()) as { success?: boolean; slug?: string; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to create board");
      return json;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["boards"] });
      onCreated?.(result.slug ?? "");
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md mx-4 bg-card rounded-xl border shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-base font-semibold">New board</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Feature Requests"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="What kind of feedback should go here?"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Visibility</label>
            <div className="grid grid-cols-2 gap-2">
              {(["public", "private"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-md border text-sm transition-colors text-left",
                    visibility === v
                      ? "border-primary bg-primary/5 text-primary"
                      : "hover:bg-muted text-muted-foreground",
                  )}
                >
                  {v === "public" ? (
                    <Globe className="h-4 w-4 shrink-0" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0" />
                  )}
                  <div>
                    <p className="font-medium capitalize">{v}</p>
                    <p className="text-[10px] leading-tight text-muted-foreground">
                      {v === "public" ? "Anyone can view & post" : "Members only"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {(error as Error).message}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Creating…" : "Create board"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
