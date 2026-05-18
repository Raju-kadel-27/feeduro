import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog";
import { cn } from "@lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import type { PublicBoard, PublicPost } from "../schemas/public";
import { FeedbackSubmitResponseSchema } from "../schemas/public";
import { avatarColor, getInitials } from "../utils";

export function FeedbackModal({
  orgSlug,
  boards,
  publicUser,
  widgetToken,
  onClose,
  onSubmitted,
}: {
  orgSlug: string;
  boards: PublicBoard[];
  publicUser: { id: string; email: string; name?: string } | null;
  widgetToken: string | null;
  onClose: () => void;
  onSubmitted: (post: PublicPost) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [boardId, setBoardId] = useState(boards[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  const authorName = publicUser?.name ?? publicUser?.email ?? "Anonymous";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !boardId) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { orgSlug, boardId, title, description };
      if (publicUser && widgetToken) {
        body.widgetToken = widgetToken;
        body.submitter = { id: publicUser.id, email: publicUser.email, name: publicUser.name };
      }

      const res = await fetch("/api/public-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const parsed = FeedbackSubmitResponseSchema.safeParse(await res.json());
      if (!res.ok) throw new Error(parsed.success ? parsed.data.error : "Submission failed");

      const board = boards.find((b) => b.id === boardId);
      onSubmitted({
        id: parsed.success && parsed.data.id ? parsed.data.id : Date.now().toString(),
        title: title.trim(),
        description: description.trim() || null,
        status: "pending",
        boardId,
        boardName: board?.name ?? "",
        authorName,
        voteCount: 0,
        commentCount: 0,
      });
      toast.success("Feedback submitted! Thank you.");
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-[480px] p-5">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Give feedback</DialogTitle>
        </DialogHeader>

        {publicUser && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ background: avatarColor(authorName) }}
            >
              {getInitials(authorName)}
            </div>
            <span className="text-[12.5px] text-muted-foreground">
              Submitting as <span className="font-medium text-foreground">{authorName}</span>
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {boards.length > 1 && (
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Board
              </label>
              <select
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2 text-[13px] outline-none focus:border-primary"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A short, clear summary"
              required
              className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2.5 text-[13px] outline-none focus:border-primary placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Details <span className="normal-case text-muted-foreground/70">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What happened? What did you expect?"
              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-[13px] outline-none focus:border-primary placeholder:text-muted-foreground resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
