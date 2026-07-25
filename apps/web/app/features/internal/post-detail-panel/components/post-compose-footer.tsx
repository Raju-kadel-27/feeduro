import type { PostDetail } from "@features/feedback/schemas/admin";
import { cn } from "@lib/utils";
import { Lock } from "lucide-react";
import { useRef, useState } from "react";
import type { useCommentActions } from "../hooks/use-comment-actions";

type CommentState = ReturnType<typeof useCommentActions>;

export function PostComposeFooter({
  post: _post,
  comments,
  isAdmin,
}: {
  post: PostDetail;
  comments: CommentState;
  isAdmin: boolean;
}) {
  const [afterStatus, setAfterStatus] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isBusy = comments.creating || comments.creatingWithStatus;

  function handleSend() {
    if (!comments.newComment.trim()) return;
    if (afterStatus) {
      comments.createCommentWithStatus(afterStatus);
      setAfterStatus("");
    } else {
      comments.createComment();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    comments.setNewComment(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card shadow-sm overflow-hidden transition-all duration-200",
        comments.isInternal
          ? "border-amber-300/70 bg-amber-50/50 dark:border-amber-700/50 dark:bg-amber-950/20"
          : "focus-within:border-border focus-within:shadow-md",
      )}
    >
      {/* Internal note label */}
      {comments.isInternal && (
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-0.5">
          <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Internal note
          </span>
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={comments.newComment}
        onChange={handleChange}
        placeholder={
          comments.isInternal
            ? "e.g. Checking with the team on this one…"
            : "e.g. Thanks for the feedback — we'll look into this!"
        }
        rows={2}
        style={{ minHeight: "56px" }}
        className="w-full px-4 pt-3 pb-2 text-sm bg-transparent focus:outline-none resize-none placeholder:text-muted-foreground/45 leading-relaxed"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && comments.newComment.trim())
            handleSend();
        }}
      />

      {/* Action row */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 border-t",
          comments.isInternal ? "border-amber-200/60 dark:border-amber-800/40" : "border-border/50",
        )}
      >
        {isAdmin && (
          <button
            type="button"
            onClick={() => comments.setIsInternal((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
              comments.isInternal
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Lock className="h-3 w-3" />
            Internal note
          </button>
        )}

        <div className="flex-1" />

        {isAdmin && (
          <select
            value={afterStatus}
            onChange={(e) => setAfterStatus(e.target.value)}
            className="h-8 w-36 rounded-lg border border-border bg-background pl-3 pr-7 text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer transition-colors hover:border-border/80"
          >
            <option value="">Then…</option>
            <option value="reviewing">➔ Reviewing</option>
            <option value="closed">➔ Close</option>
            <option value="completed">➔ Complete</option>
          </select>
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={isBusy || !comments.newComment.trim()}
          className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {isBusy ? "Posting…" : afterStatus ? "Comment & Done" : "Comment"}
        </button>
      </div>
    </div>
  );
}
