import { Paperclip, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { PublicBoard, PublicPost, SessionUser } from "../schemas/public";
import { FeedbackSubmitResponseSchema } from "../schemas/public";

type Props = {
  orgSlug: string;
  boards: PublicBoard[];
  publicUser: { id: string; email: string; name?: string } | null;
  widgetToken: string | null;
  sessionUser: SessionUser | null;
  onSubmitted: (post: PublicPost) => void;
  onAuthRequired: () => void;
};

export function InlineFeedbackForm({
  orgSlug,
  boards,
  publicUser,
  widgetToken,
  sessionUser,
  onSubmitted,
  onAuthRequired,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [boardId, setBoardId] = useState(boards[0]?.id ?? "");

  const userName = sessionUser?.name ?? publicUser?.name;

  function handleClear() {
    setTitle("");
    setDescription("");
  }

  async function handleSubmit() {
    if (!sessionUser && !publicUser) {
      onAuthRequired();
      return;
    }
    if (!title.trim() || !boardId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/public-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), boardId, orgSlug, widgetToken }),
      });
      const parsed = FeedbackSubmitResponseSchema.safeParse(await res.json());
      if (!res.ok || !parsed.success || parsed.data.error) {
        toast.error(parsed.success ? (parsed.data.error ?? "Failed to submit") : "Failed to submit");
        return;
      }
      toast.success("Feedback submitted!");
      const board = boards.find((b) => b.id === boardId);
      onSubmitted({
        id: parsed.data.id!,
        title: title.trim(),
        description: description.trim() || null,
        status: "pending",
        boardId,
        boardName: board?.name ?? "",
        authorName: userName ?? "Anonymous",
        authorIsAdmin: false,
        voteCount: 0,
        commentCount: 0,
      });
      handleClear();
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm mb-4 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/60">
        <select
          value={boardId}
          onChange={(e) => setBoardId(e.target.value)}
          className="w-auto bg-transparent text-[13px] font-medium text-foreground focus:outline-none cursor-pointer"
        >
          {boards.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleClear}
          className="ml-auto text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-1">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Submission title"
          className="w-full bg-transparent text-[15px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details"
          rows={1}
          className="mt-2 w-full resize-none bg-transparent text-[12.5px] text-muted-foreground placeholder:text-muted-foreground/35 focus:outline-none"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          type="button"
          className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!title.trim() || submitting}
          className="px-5 py-2 rounded-lg bg-foreground text-background text-[13px] font-semibold hover:bg-foreground/90 disabled:opacity-40 transition-colors"
        >
          Create
        </button>
      </div>
    </div>
  );
}
