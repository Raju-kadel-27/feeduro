import type { PostDetail } from "@features/feedback/schemas/admin";
import { cn } from "@lib/utils";
import { Lock, Smile } from "lucide-react";
import type { useCommentActions } from "../hooks/use-comment-actions";
import { FeedbackAvatar } from "./feedback-avatar";

type CommentState = ReturnType<typeof useCommentActions>;

export function PostComposeFooter({
  post,
  comments,
  isAdmin,
}: {
  post: PostDetail;
  comments: CommentState;
  isAdmin: boolean;
}) {
  return (
    <div className="border-t bg-background shrink-0 px-4 py-2">
      <div className="flex items-center gap-2">
        <FeedbackAvatar name={post.authorName} image={post.authorImage} size={24} />
        <div className="flex-1 flex items-center gap-2 rounded-lg border bg-muted/30 px-3 focus-within:ring-2 focus-within:ring-primary">
          <textarea
            value={comments.newComment}
            onChange={(e) => comments.setNewComment(e.target.value)}
            placeholder="Reply to this request…"
            rows={1}
            className="flex-1 py-1.5 text-xs bg-transparent focus:outline-none resize-none placeholder:text-muted-foreground/60"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && comments.newComment.trim())
                comments.createComment();
            }}
          />
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <Smile className="h-3.5 w-3.5" />
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => comments.setIsInternal((v) => !v)}
                className={cn(
                  "p-1 rounded transition-colors",
                  comments.isInternal
                    ? "text-amber-600"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Lock className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (comments.newComment.trim()) comments.createComment();
          }}
          disabled={comments.creating || !comments.newComment.trim()}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {comments.creating ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}
