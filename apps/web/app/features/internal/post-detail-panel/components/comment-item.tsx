import { FeedbackAvatar } from "@features/feedback/components/feedback-avatar";
import type { CommentData } from "@features/feedback/schemas/admin";
import { timeAgo } from "@features/feedback/utils";
import { cn } from "@lib/utils";
import { CornerDownRight, Lock, Pin, PinOff, Trash2 } from "lucide-react";

function renderBody(body: string): React.ReactNode {
  const parts = body.split(/(@\w+)/g);
  return parts.map((part, i) =>
    /^@\w+$/.test(part)
      ? <span key={i} className="font-medium text-violet-600 dark:text-violet-400">{part}</span>
      : part,
  );
}

export function CommentItem({
  comment,
  isAdmin,
  canRespond,
  replyingTo,
  replyBodies,
  replying,
  pinning,
  onSetReplyingTo,
  onReplyBodyChange,
  onSubmitReply,
  onDeleteComment,
  onTogglePin,
}: {
  comment: CommentData;
  isAdmin: boolean;
  canRespond: boolean;
  replyingTo: string | null;
  replyBodies: Record<string, string>;
  replying: boolean;
  pinning: boolean;
  onSetReplyingTo: (id: string | null) => void;
  onReplyBodyChange: (id: string, body: string) => void;
  onSubmitReply: (parentId: string, body: string) => void;
  onDeleteComment: (id: string) => void;
  onTogglePin: (commentId: string, pinned: boolean) => void;
}) {
  const displayName = comment.userName ?? comment.userEmail ?? "Unknown";
  return (
    <div
      className={cn(
        "py-2",
        comment.isPinned && "rounded-lg border border-primary/20 bg-primary/5 px-2.5 -mx-2.5",
      )}
    >
      {comment.isPinned && (
        <div className="flex items-center gap-1 mb-1.5 text-[10px] font-medium text-primary/70 uppercase tracking-wider">
          <Pin className="h-2.5 w-2.5" />
          Pinned
        </div>
      )}
      <div className="flex gap-2.5">
        <FeedbackAvatar name={comment.userName} image={comment.userImage} size={20} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-xs font-semibold">{displayName}</span>
            <span className="text-[11px] text-muted-foreground">{timeAgo(comment.createdAt)}</span>
            {comment.isInternal && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700">
                <Lock className="h-2.5 w-2.5" />
                Internal
              </span>
            )}
          </div>
          <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
            {renderBody(comment.body)}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              onClick={() => onSetReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <CornerDownRight className="h-3 w-3" />
              Reply
            </button>
            {canRespond && (
              <button
                type="button"
                disabled={pinning}
                onClick={() => onTogglePin(comment.id, !comment.isPinned)}
                className={cn(
                  "flex items-center gap-1 text-xs transition-colors",
                  comment.isPinned
                    ? "text-primary/70 hover:text-destructive"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {comment.isPinned ? (
                  <>
                    <PinOff className="h-3 w-3" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="h-3 w-3" />
                    Pin
                  </>
                )}
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={() => onDeleteComment(comment.id)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
          </div>

          {replyingTo === comment.id && (
            <div className="mt-1.5 space-y-1.5">
              <textarea
                value={replyBodies[comment.id] ?? ""}
                onChange={(e) => onReplyBodyChange(comment.id, e.target.value)}
                placeholder="Write a reply…"
                rows={2}
                className="w-full px-2.5 py-1.5 text-xs border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const body = replyBodies[comment.id]?.trim();
                    if (body) onSubmitReply(comment.id, body);
                  }}
                  disabled={replying || !replyBodies[comment.id]?.trim()}
                  className="px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                >
                  {replying ? "Sending…" : "Reply"}
                </button>
                <button
                  type="button"
                  onClick={() => onSetReplyingTo(null)}
                  className="px-2.5 py-1 text-xs font-medium hover:bg-muted rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {comment.replies.length > 0 && (
            <div className="mt-2 space-y-2 pl-3 border-l-2 border-border/40">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex gap-2">
                  <FeedbackAvatar name={reply.userName} image={reply.userImage} size={16} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-semibold">
                        {reply.userName ?? reply.userEmail ?? "Unknown"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {timeAgo(reply.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                      {renderBody(reply.body)}
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onDeleteComment(reply.id)}
                        className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
