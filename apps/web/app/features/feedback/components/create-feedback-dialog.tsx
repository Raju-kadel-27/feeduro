import { Dialog, DialogContent } from "@components/ui/dialog";
import { cn } from "@lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, X } from "lucide-react";
import { useState } from "react";

interface Props {
  boardId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface BoardOption {
  id: string;
  name: string;
}

interface CategoryOption {
  id: string;
  name: string;
  color: string;
}

export function CreateFeedbackDialog({ boardId: defaultBoardId, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBoardId, setSelectedBoardId] = useState(defaultBoardId);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const { data: boardsData } = useQuery({
    queryKey: ["boards"],
    queryFn: async () => {
      const res = await fetch("/api/boards");
      return res.json() as Promise<{ boards: BoardOption[] }>;
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      return res.json() as Promise<{ categories: CategoryOption[] }>;
    },
  });

  const boards = boardsData?.boards ?? [];
  const categories = categoriesData?.categories ?? [];
  const showBoardPicker = boards.length > 1;

  const { mutate, isPending, error } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "create",
          title,
          description,
          boardId: selectedBoardId,
          categoryId: selectedCategoryId || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to create");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback", selectedBoardId] });
      onSuccess?.();
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    mutate();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[520px] p-0 rounded-xl overflow-hidden gap-0 [&>button]:hidden">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60">
          {showBoardPicker ? (
            <select
              value={selectedBoardId}
              onChange={(e) => setSelectedBoardId(e.target.value)}
              className="w-auto bg-transparent text-[13px] font-medium text-foreground focus:outline-none cursor-pointer"
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          ) : (
            <span className="text-[13px] font-medium text-foreground">
              {boards[0]?.name ?? "New feedback"}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Body */}
          <div className="px-4 pt-4 pb-2 space-y-4">
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Submission title"
                autoFocus
                className="w-full bg-transparent text-[15px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
              />
            </div>

            <div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details (optional)"
                rows={4}
                className="w-full resize-none bg-transparent text-[13px] text-muted-foreground placeholder:text-muted-foreground/35 focus:outline-none"
              />
            </div>

            {categories.length > 0 && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Category
                </label>
                <div className="relative">
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full appearance-none h-8 pl-3 pr-8 rounded-md border border-border bg-background text-[12.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                  >
                    <option value="">No category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            )}

            {error && (
              <p className="text-[12px] text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {(error as Error).message}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-8 rounded-lg border border-border text-[13px] font-medium text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className={cn(
                "px-5 h-8 rounded-lg bg-foreground text-background text-[13px] font-semibold hover:bg-foreground/90 disabled:opacity-40 transition-colors",
              )}
            >
              {isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>

      </DialogContent>
    </Dialog>
  );
}
