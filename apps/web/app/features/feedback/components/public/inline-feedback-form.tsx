import { Paperclip, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { PublicBoard, PublicPost, SessionUser } from "../../schemas/public";
import { FeedbackSubmitResponseSchema } from "../../schemas/public";

type Props = {
  orgSlug: string;
  boards: PublicBoard[];
  selectedBoardId?: string;
  publicUser: { id: string; email: string; name?: string } | null;
  widgetToken: string | null;
  sessionUser: SessionUser | null;
  onSubmitted: (post: PublicPost) => void;
  onAuthRequired: () => void;
};

export function InlineFeedbackForm({
  orgSlug,
  boards,
  selectedBoardId,
  publicUser,
  widgetToken,
  sessionUser,
  onSubmitted,
  onAuthRequired,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [boardId, setBoardId] = useState(selectedBoardId ?? boards[0]?.id ?? "");

  useEffect(() => {
    if (selectedBoardId) setBoardId(selectedBoardId);
  }, [selectedBoardId]);

  const userName = sessionUser?.name ?? publicUser?.name;

  function handleClear() {
    setTitle("");
    setDescription("");
    setCollapsed(true);
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
    collapsed ? (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm mb-4 px-4 h-12 hover:bg-muted/30 transition-colors group"
      >
        <span className="text-[16px] text-muted-foreground/50">Share your feedback...</span>
        <span className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0 group-hover:bg-primary/90 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </button>
    ) : (
    <div className="relative rounded-xl border border-border bg-card shadow-sm mb-4 overflow-hidden animate-fade-in">
      {/* Clear button */}
      <button
        type="button"
        onClick={handleClear}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded z-10"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Body */}
      <div className="px-4 pt-4 pb-1 pr-9">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Submission title"
          className="w-full bg-transparent text-[17px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details"
          rows={1}
          className="mt-2 w-full resize-none rounded-none bg-transparent text-[14.5px] text-muted-foreground placeholder:text-muted-foreground/35 focus:outline-none"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <select
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            className="bg-muted/30 border border-border rounded-full text-[15px] font-medium text-foreground pl-3 pr-7 py-1 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer hover:bg-muted transition-colors"
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[15px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Paperclip className="h-3.5 w-3.5" />
            Attach
          </button>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!title.trim() || submitting}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-[15px] font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          Give Feedback
        </button>
      </div>
    </div>
  )
  );
}
