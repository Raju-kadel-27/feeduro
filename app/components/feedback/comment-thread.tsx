import { cn } from "@lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CornerDownRight, Lock, Trash2 } from "lucide-react";
import { useState } from "react";

interface Reply {
  id: string;
  body: string;
  isInternal: boolean;
  parentId: string;
  userId: string;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
}

export interface ThreadedComment {
  id: string;
  body: string;
  isInternal: boolean;
  parentId: string | null;
  userId: string;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  replies: Reply[];
}

interface CommentThreadProps {
  postId: string;
  initialComments: ThreadedComment[];
  currentUserId: string;
  isAdmin: boolean;
}

function timeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}d ago`;
  return d.toLocaleDateString();
}

function Avatar({ name, image }: { name: string | null; image?: string | null }) {
  const initials = (name ?? "?")[0]?.toUpperCase();
  if (image) {
    return (
      <img src={image} alt={name ?? ""} className="h-7 w-7 rounded-full object-cover shrink-0" />
    );
  }
  return (
    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
      {initials}
    </div>
  );
}

function ReplyForm({
  onSubmit,
  onCancel,
  disabled,
}: {
  onSubmit: (body: string) => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  const [body, setBody] = useState("");
  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply…"
        rows={2}
        autoFocus
        className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            if (body.trim()) onSubmit(body.trim());
          }}
          disabled={disabled || !body.trim()}
          className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {disabled ? "Sending…" : "Reply"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-xs font-medium hover:bg-muted rounded-md cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  isReply = false,
  onReply,
  onDelete,
  currentUserId,
  isAdmin,
  replyingTo,
  setReplyingTo,
  replyPending,
}: {
  comment: ThreadedComment | Reply;
  isReply?: boolean;
  onReply: (parentId: string, body: string) => void;
  onDelete: (id: string, parentId: string | null) => void;
  currentUserId: string;
  isAdmin: boolean;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  replyPending: boolean;
}) {
  const canDelete = isAdmin || comment.userId === currentUserId;
  const displayName = comment.userName ?? comment.userEmail ?? "Unknown";
  const parentId = "parentId" in comment ? comment.parentId : null;

  return (
    <div className={cn("flex gap-3", isReply && "ml-9 mt-3")}>
      <Avatar name={comment.userName} image={comment.userImage} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{displayName}</span>
          <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
          {comment.isInternal && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Lock className="h-2.5 w-2.5" />
              Internal
            </span>
          )}
        </div>
        <p className="text-sm mt-1 text-foreground/90 whitespace-pre-wrap break-words">
          {comment.body}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          {!isReply && (
            <button
              type="button"
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <CornerDownRight className="h-3 w-3" />
              Reply
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(comment.id, parentId)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          )}
        </div>
        {replyingTo === comment.id && (
          <ReplyForm
            disabled={replyPending}
            onSubmit={(body) => onReply(comment.id, body)}
            onCancel={() => setReplyingTo(null)}
          />
        )}
      </div>
    </div>
  );
}

export function CommentThread({
  postId,
  initialComments,
  currentUserId,
  isAdmin,
}: CommentThreadProps) {
  const qc = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const { data } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const res = await fetch(`/api/comments?postId=${postId}`);
      return res.json() as Promise<{ comments: ThreadedComment[] }>;
    },
    initialData: { comments: initialComments },
  });

  const threadedComments = data?.comments ?? [];

  const { mutate: createComment, isPending: creating } = useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create", postId, body, isInternal }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      return res.json();
    },
    onSuccess: () => {
      setNewComment("");
      setIsInternal(false);
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      qc.invalidateQueries({ queryKey: ["feedback"] });
    },
  });

  const { mutate: createReply, isPending: replying } = useMutation({
    mutationFn: async ({ parentId, body }: { parentId: string; body: string }) => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "reply", postId, parentId, body }),
      });
      if (!res.ok) throw new Error("Failed to post reply");
      return res.json();
    },
    onSuccess: () => {
      setReplyingTo(null);
      qc.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });

  const { mutate: deleteComment } = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "delete", commentId }),
      });
      if (!res.ok) throw new Error("Failed to delete comment");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      qc.invalidateQueries({ queryKey: ["feedback"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Comments</h2>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
          {threadedComments.reduce((acc, c) => acc + 1 + c.replies.length, 0)}
        </span>
      </div>

      {threadedComments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment.</p>
      ) : (
        <div className="space-y-5">
          {threadedComments.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                onReply={(parentId, body) => createReply({ parentId, body })}
                onDelete={(id) => deleteComment(id)}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                replyPending={replying}
              />
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  isReply
                  onReply={(parentId, body) => createReply({ parentId, body })}
                  onDelete={(id) => deleteComment(id)}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  replyPending={replying}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Add comment form */}
      <div className="space-y-2 pt-2 border-t">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Leave a comment…"
          rows={3}
          className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded"
            />
            <span className="text-xs text-muted-foreground">Internal note</span>
          </label>
          <button
            type="button"
            onClick={() => {
              if (newComment.trim()) createComment(newComment.trim());
            }}
            disabled={creating || !newComment.trim()}
            className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors hover:bg-primary/90"
          >
            {creating ? "Posting…" : "Post comment"}
          </button>
        </div>
      </div>
    </div>
  );
}
