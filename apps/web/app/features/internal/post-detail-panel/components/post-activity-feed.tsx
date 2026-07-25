import type { ActivityData, CommentData } from "@features/feedback/schemas/admin";
import { ActivityItem } from "./activity-item";
import { CommentItem } from "./comment-item";

export type FeedItem =
  | { kind: "comment"; data: CommentData; createdAt: string; isPinned: boolean }
  | { kind: "activity"; data: ActivityData; createdAt: string; isPinned: false };

export function PostActivityFeed({
  feed,
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
  onOpenPost,
}: {
  feed: FeedItem[];
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
  onOpenPost?: (id: string) => void;
}) {
  if (feed.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        No activity yet. Be the first to comment!
      </p>
    );
  }

  const sorted = [...feed].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <div className="space-y-0.5">
      {sorted.map((item) => {
        if (item.kind === "activity") {
          return <ActivityItem key={item.data.id} activity={item.data} onOpenPost={onOpenPost} />;
        }
        return (
          <CommentItem
            key={item.data.id}
            comment={item.data}
            isAdmin={isAdmin}
            canRespond={canRespond}
            replyingTo={replyingTo}
            replyBodies={replyBodies}
            replying={replying}
            pinning={pinning}
            onSetReplyingTo={onSetReplyingTo}
            onReplyBodyChange={onReplyBodyChange}
            onSubmitReply={onSubmitReply}
            onDeleteComment={onDeleteComment}
            onTogglePin={onTogglePin}
          />
        );
      })}
    </div>
  );
}
