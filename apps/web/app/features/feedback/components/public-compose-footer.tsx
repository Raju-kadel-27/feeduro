import { FeedbackAvatar } from "@features/post-detail-panel/components/feedback-avatar";
import { useState } from "react";
import type { SessionUser } from "../schemas/public";

export function PublicComposeFooter({
  postId,
  orgSlug,
  sessionUser,
  onAuthRequired,
  onCommentPosted,
}: {
  postId: string;
  orgSlug: string;
  sessionUser: SessionUser | null;
  onAuthRequired: () => void;
  onCommentPosted: () => void;
}) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!sessionUser) { onAuthRequired(); return; }
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/public-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, orgSlug, body: trimmed }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to post comment");
      setBody("");
      onCommentPosted();
    } catch (err) {
      console.error("[public-comments] failed to post comment", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-t bg-background shrink-0 px-4 py-2">
      <div className="flex items-center gap-2">
        <FeedbackAvatar name={sessionUser?.name ?? null} image={sessionUser?.image ?? null} size={24} />
        <div className="flex-1 flex items-center rounded-lg border bg-muted/30 px-3 focus-within:ring-2 focus-within:ring-primary">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={sessionUser ? "Add a comment…" : "Sign in to comment…"}
            rows={1}
            onFocus={() => { if (!sessionUser) onAuthRequired(); }}
            className="flex-1 py-1.5 text-xs bg-transparent focus:outline-none resize-none placeholder:text-muted-foreground/60"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && body.trim()) handleSubmit();
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !body.trim()}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {submitting ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}
