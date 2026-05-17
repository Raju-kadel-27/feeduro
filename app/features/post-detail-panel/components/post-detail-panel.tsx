import { useEffect, useRef } from "react";
import { useCommentActions } from "../hooks/use-comment-actions";
import { useIntegrationLinks } from "../hooks/use-integration-links";
import { useMergeActions } from "../hooks/use-merge-actions";
import { usePostData } from "../hooks/use-post-data";
import { useVoteStatus } from "../hooks/use-vote-status";
import type { AdminStatus } from "@features/feedback/schemas/admin";
import { PostComposeFooter } from "./post-compose-footer";
import { PostDetailBody } from "./post-detail-body";
import { PostDetailHeader } from "./post-detail-header";
import type { FeedItem } from "./post-activity-feed";
import { PostMergeDialog } from "./post-merge-dialog";

export function PostDetailPanel({
  postId,
  orgSlug,
  onClose,
  onDataChange,
  onOpenPost,
}: {
  postId: string;
  orgSlug: string;
  onClose: () => void;
  onDataChange: () => void;
  onOpenPost?: (id: string) => void;
}) {
  const { detailData, isLoading, comments: commentList, activities } = usePostData(postId);
  const initializedRef = useRef(false);
  const vote = useVoteStatus(postId, onDataChange);
  const comments = useCommentActions(postId, onDataChange);
  const merge = useMergeActions({ postId, initializedRef, onDataChange, onOpenPost, onClose });
  const integrations = useIntegrationLinks(postId);

  const post = detailData?.postDetail;
  const isAdmin = detailData?.currentRole === "admin";

  useEffect(() => {
    if (post && !initializedRef.current) {
      vote.setVoteCount(post.voteCount);
      vote.setHasVoted(post.hasVoted);
      vote.setStatus(post.status as AdminStatus);
      integrations.setLinearLink(detailData?.linearLink ?? null);
      integrations.setJiraLink(detailData?.jiraLink ?? null);
      integrations.setAsanaLink(detailData?.asanaLink ?? null);
      comments.setSummary(post.aiSummary ?? null);
      comments.setSummaryGeneratedAt(post.aiSummaryGeneratedAt ?? null);
      initializedRef.current = true;
    }
  }, [post, detailData, vote, integrations, comments]);

  useEffect(() => {
    const t = setTimeout(() => merge.setMergeDebounced(merge.mergeSearch), 280);
    return () => clearTimeout(t);
  }, [merge.mergeSearch, merge]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (merge.mergeOpen) merge.setMergeOpen(false);
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [merge.mergeOpen, merge, onClose]);

  const feed: FeedItem[] = [
    ...commentList.map((c) => ({ kind: "comment" as const, data: c, createdAt: c.createdAt })),
    ...activities.map((a) => ({ kind: "activity" as const, data: a, createdAt: a.createdAt })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const totalComments = commentList.reduce((acc, c) => acc + 1 + c.replies.length, 0);

  if (isLoading || !post || !detailData) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-background/30 backdrop-blur-[4px]" onClick={onClose} />
        <div className="fixed right-0 top-0 h-screen w-[800px] z-50 bg-background border-l shadow-2xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/30 backdrop-blur-[4px]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-screen w-[780px] max-w-[95vw] z-50 bg-background border-l shadow-2xl flex flex-col overflow-hidden">
        <PostDetailHeader
          orgSlug={orgSlug}
          postId={postId}
          isAdmin={isAdmin}
          hasMergedInto={!!post.mergedIntoPostId}
          vote={vote}
          integrations={integrations}
          onMergeOpen={merge.openMergeDialog}
          onClose={onClose}
        />
        <PostDetailBody
          post={post}
          detailData={detailData}
          orgSlug={orgSlug}
          postId={postId}
          isAdmin={isAdmin}
          vote={vote}
          comments={comments}
          merge={merge}
          integrations={integrations}
          feed={feed}
          totalComments={totalComments}
          onClose={onClose}
          onOpenPost={onOpenPost}
        />
        <PostComposeFooter post={post} comments={comments} isAdmin={isAdmin} />
      </div>
      {merge.mergeOpen && (
        <PostMergeDialog
          postTitle={post.title}
          mergeStep={merge.mergeStep}
          mergeSearch={merge.mergeSearch}
          mergeTarget={merge.mergeTarget}
          mergeResults={merge.mergeResults}
          searchingPosts={merge.searchingPosts}
          merging={merge.merging}
          onSearchChange={merge.setMergeSearch}
          onSelectTarget={(p) => { merge.setMergeTarget(p); merge.setMergeStep("confirm"); }}
          onBack={() => merge.setMergeStep("search")}
          onConfirm={() => {
            if (merge.mergeTarget)
              merge.doMerge({ sourcePostId: postId, targetPostId: merge.mergeTarget.id });
          }}
          onCancel={() => merge.setMergeOpen(false)}
        />
      )}
    </>
  );
}
