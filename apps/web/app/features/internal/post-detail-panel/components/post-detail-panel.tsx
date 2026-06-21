import type { AdminStatus } from "@features/feedback/schemas/admin";
import type { Segment } from "@features/internal/segmentation/types";
import { cn } from "@lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCommentActions } from "../hooks/use-comment-actions";
import { useIntegrationLinks } from "../hooks/use-integration-links";
import { useMergeActions } from "../hooks/use-merge-actions";
import { useOwnerPicker } from "../hooks/use-owner-picker";
import { usePostData } from "../hooks/use-post-data";
import { useVoteStatus } from "../hooks/use-vote-status";
import type { FeedItem } from "./post-activity-feed";
import { PostDetailBody, type Tab } from "./post-detail-body";
import { PostDetailHeader } from "./post-detail-header";
import { PostMergeDialog } from "./post-merge-dialog";

export function PostDetailPanel({
  postId,
  orgSlug,
  onClose,
  onDataChange,
  onOpenPost,
  segments = [],
}: {
  postId: string;
  orgSlug: string;
  onClose: () => void;
  onDataChange: () => void;
  onOpenPost?: (id: string) => void;
  segments?: Segment[];
}) {
  const { detailData, isLoading, comments: commentList, activities } = usePostData(postId);
  const initializedRef = useRef(false);
  const vote = useVoteStatus(postId, onDataChange);
  const comments = useCommentActions(postId, onDataChange);
  const merge = useMergeActions({ postId, initializedRef, onDataChange, onOpenPost, onClose });
  const integrations = useIntegrationLinks(postId);
  const owner = useOwnerPicker(postId, onDataChange);
  const [activeTab, setActiveTab] = useState<Tab>("comments");
  const qc = useQueryClient();

  const post = detailData?.postDetail;
  const isAdmin = detailData?.currentRole === "admin";
  // Right section (integrations + segment breakdown) always visible for admins
  const showRightPanel = isAdmin;

  const { mutate: deletePost } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "delete", id: postId }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Delete failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback"] });
      toast.success("Post deleted");
      onDataChange();
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to delete post");
    },
  });

  function handleDeletePost() {
    deletePost();
  }

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
      owner.setOwnerId(post.ownerId ?? null);
      owner.setOwnerName(post.ownerName ?? null);
      owner.setOwnerImage(post.ownerImage ?? null);
      owner.setOrgAdmins(detailData?.orgAdmins ?? []);
      initializedRef.current = true;
    }
  }, [post, detailData, vote, integrations, comments, owner]);

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

  const panelWidthClass = showRightPanel
    ? "w-[95vw] md:w-[700px] lg:w-[1000px] xl:w-[1400px]"
    : "w-[95vw] md:w-[700px] lg:w-[800px]";

  if (isLoading || !post || !detailData) {
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-background/30 backdrop-blur-[4px]"
          onClick={onClose}
        />
        <div className={cn("fixed right-0 top-0 h-screen z-50 bg-background border-l shadow-2xl flex items-center justify-center transition-[width] duration-300", "w-[95vw] md:w-[700px]")}>
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
      <div className={cn(
        "fixed right-0 top-0 h-screen z-50 bg-background border-l shadow-2xl flex flex-col overflow-hidden transition-[width] duration-300",
        panelWidthClass,
      )}>
        <PostDetailHeader
          orgSlug={orgSlug}
          postId={postId}
          postTitle={post.title}
          isAdmin={isAdmin}
          hasMergedInto={!!post.mergedIntoPostId}
          vote={vote}
          owner={owner}
          onMergeOpen={merge.openMergeDialog}
          onDeletePost={handleDeletePost}
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
          segments={segments}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClose={onClose}
          onOpenPost={onOpenPost}
        />
      </div>
      <PostMergeDialog
        open={merge.mergeOpen}
        onOpenChange={(o) => merge.setMergeOpen(o)}
        postTitle={post.title}
        mergeStep={merge.mergeStep}
        mergeSearch={merge.mergeSearch}
        mergeTarget={merge.mergeTarget}
        mergeResults={merge.mergeResults}
        searchingPosts={merge.searchingPosts}
        merging={merge.merging}
        onSearchChange={merge.setMergeSearch}
        onSelectTarget={(p) => {
          merge.setMergeTarget(p);
          merge.setMergeStep("confirm");
        }}
        onBack={() => merge.setMergeStep("search")}
        onConfirm={() => {
          if (merge.mergeTarget)
            merge.doMerge({ sourcePostId: postId, targetPostId: merge.mergeTarget.id });
        }}
      />
    </>
  );
}
