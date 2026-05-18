import type { DetailData, PostDetail } from "@features/feedback/schemas/admin";
import { timeAgo } from "@features/feedback/utils";
import { cn } from "@lib/utils";
import { Bot, ChevronUp, RefreshCw } from "lucide-react";
import { Link } from "react-router";
import type { useCommentActions } from "../hooks/use-comment-actions";
import type { useIntegrationLinks } from "../hooks/use-integration-links";
import type { useMergeActions } from "../hooks/use-merge-actions";
import type { useVoteStatus } from "../hooks/use-vote-status";
import { FeedbackAvatar } from "./feedback-avatar";
import { type FeedItem, PostActivityFeed } from "./post-activity-feed";
import { IntegrationRows } from "./post-integration-rows";
import { PostMergedBanner } from "./post-merged-banner";

type VoteState = ReturnType<typeof useVoteStatus>;
type CommentState = ReturnType<typeof useCommentActions>;
type MergeState = ReturnType<typeof useMergeActions>;
type IntegrationState = ReturnType<typeof useIntegrationLinks>;

export function PostDetailBody({
  post,
  detailData,
  orgSlug,
  postId,
  isAdmin,
  vote,
  comments,
  merge,
  integrations,
  feed,
  totalComments,
  onClose,
  onOpenPost,
}: {
  post: PostDetail;
  detailData: DetailData;
  orgSlug: string;
  postId: string;
  isAdmin: boolean;
  vote: VoteState;
  comments: CommentState;
  merge: MergeState;
  integrations: IntegrationState;
  feed: FeedItem[];
  totalComments: number;
  onClose: () => void;
  onOpenPost?: (id: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-5 pt-3 pb-3 space-y-4 max-w-2xl mx-auto">
        {post.mergedIntoPostId && detailData.mergedIntoPost && (
          <PostMergedBanner
            title={detailData.mergedIntoPost.title}
            targetId={detailData.mergedIntoPost.id}
            isAdmin={isAdmin}
            canUnmerge={detailData.canUnmerge}
            unmerging={merge.unmerging}
            onOpenPost={onOpenPost}
            onUnmerge={() => merge.doUnmerge(postId)}
          />
        )}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap flex-1">
            <FeedbackAvatar name={post.authorName} image={post.authorImage} size={16} />
            <span>
              <span className="font-medium text-foreground/80">{post.authorName}</span>
              {" opened "}
              {timeAgo(post.createdAt)}
            </span>
            {detailData.board && (
              <>
                <span>·</span>
                <Link
                  to={`/${orgSlug}/dashboard`}
                  onClick={onClose}
                  className="px-1.5 py-0.5 rounded-full text-[10px] bg-muted hover:bg-muted/80 font-medium transition-colors text-foreground/60"
                >
                  {detailData.board.name}
                </Link>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => !vote.voting && vote.toggleVote()}
            disabled={vote.voting}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 w-9 h-9 border-[1.5px] transition-all duration-150 shrink-0 select-none",
              vote.hasVoted
                ? "border-[#3f3f46] bg-[#fafafa] text-[#18181b]"
                : "border-[#e4e4e7] bg-white text-[#a1a1aa]",
              vote.voting && "opacity-50 cursor-not-allowed",
            )}
          >
            <ChevronUp
              className={cn("h-3 w-3", vote.hasVoted ? "stroke-[2.5]" : "stroke-[1.75]")}
            />
            <span className="text-[10px] font-semibold leading-none tabular-nums">
              {vote.voteCount}
            </span>
          </button>
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold leading-snug">{post.title}</h2>
          {post.description && (
            <p className="text-xs text-foreground/60 leading-relaxed whitespace-pre-wrap">
              {post.description}
            </p>
          )}
        </div>
        <IntegrationRows integrations={integrations} isAdmin={isAdmin} />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Comments
              {totalComments > 0 && (
                <span className="ml-1.5 normal-case font-normal">· {totalComments}</span>
              )}
            </h3>
            {isAdmin && (
              <button
                type="button"
                onClick={() => comments.generateSummary()}
                disabled={comments.generatingSummary}
                className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium rounded-md border hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
              >
                {comments.generatingSummary ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Bot className="h-3 w-3" />
                )}
                {comments.generatingSummary
                  ? "Summarizing…"
                  : comments.summary
                    ? "Regenerate"
                    : "Summarize"}
              </button>
            )}
          </div>
          {comments.summary && (
            <div className="rounded-lg border bg-primary/5 border-primary/20 px-3.5 py-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                  AI Summary
                </span>
                {comments.summaryGeneratedAt && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(comments.summaryGeneratedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">{comments.summary}</p>
            </div>
          )}
          <PostActivityFeed
            feed={feed}
            isAdmin={isAdmin}
            replyingTo={comments.replyingTo}
            replyBodies={comments.replyBodies}
            replying={comments.replying}
            onSetReplyingTo={comments.setReplyingTo}
            onReplyBodyChange={(id, body) =>
              comments.setReplyBodies((prev) => ({ ...prev, [id]: body }))
            }
            onSubmitReply={(parentId, body) => comments.createReply({ parentId, body })}
            onDeleteComment={comments.deleteComment}
            onOpenPost={onOpenPost}
          />
        </div>
        <div className="h-2" />
      </div>
    </div>
  );
}
