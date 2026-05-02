import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, X } from "lucide-react";
import { useState } from "react";

interface Props {
  /** Pre-selects this board but the user can change it. */
  boardId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface BoardOption {
  id: string;
  name: string;
}

export function CreateFeedbackDialog({ boardId: defaultBoardId, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBoardId, setSelectedBoardId] = useState(defaultBoardId);

  const { data: boardsData } = useQuery({
    queryKey: ["boards"],
    queryFn: async () => {
      const res = await fetch("/api/boards");
      return res.json() as Promise<{ boards: BoardOption[] }>;
    },
  });

  const boards = boardsData?.boards ?? [];
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg mx-4 bg-card rounded-xl border shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-base font-semibold">Submit feedback</h2>
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
            <label className="text-sm font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Short, clear summary of your idea or issue"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Details <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Describe the problem or idea in more detail…"
              rows={4}
            />
          </div>

          {showBoardPicker && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Board</label>
              <div className="relative">
                <select
                  value={selectedBoardId}
                  onChange={(e) => setSelectedBoardId(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-8 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {boards.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          )}

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
              disabled={isPending || !title.trim()}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Submitting…" : "Submit feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
