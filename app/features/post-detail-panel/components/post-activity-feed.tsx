import { ActivityItem } from "./activity-item";
import { CommentItem } from "./comment-item";
import type { ActivityData, CommentData } from "@features/feedback/schemas/admin";

export type FeedItem =
  | { kind: "comment"; data: CommentData; createdAt: string }
  | { kind: "activity"; data: ActivityData; createdAt: string };

export function PostActivityFeed({
  feed,
  isAdmin,
  replyingTo,
  replyBodies,
  replying,
  onSetReplyingTo,
  onReplyBodyChange,
  onSubmitReply,
  onDeleteComment,
  onOpenPost,
}: {
  feed: FeedItem[];
  isAdmin: boolean;
  replyingTo: string | null;
  replyBodies: Record<string, string>;
  replying: boolean;
  onSetReplyingTo: (id: string | null) => void;
  onReplyBodyChange: (id: string, body: string) => void;
  onSubmitReply: (parentId: string, body: string) => void;
  onDeleteComment: (id: string) => void;
  onOpenPost?: (id: string) => void;
}) {
  if (feed.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">No activity yet. Be the first to comment!</p>
    );
  }
  return (
    <div className="space-y-0.5">
      {feed.map((item) => {
        if (item.kind === "activity") {
          return <ActivityItem key={item.data.id} activity={item.data} onOpenPost={onOpenPost} />;
        }
        return (
          <CommentItem
            key={item.data.id}
            comment={item.data}
            isAdmin={isAdmin}
            replyingTo={replyingTo}
            replyBodies={replyBodies}
            replying={replying}
            onSetReplyingTo={onSetReplyingTo}
            onReplyBodyChange={onReplyBodyChange}
            onSubmitReply={onSubmitReply}
            onDeleteComment={onDeleteComment}
          />
        );
      })}
    </div>
  );
}
