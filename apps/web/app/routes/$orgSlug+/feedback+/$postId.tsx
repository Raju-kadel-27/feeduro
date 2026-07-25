import { requireOrgBySlug } from "@features/auth/server/guards";
import type { AdminStatus } from "@features/feedback/schemas/admin";
import type { FeedItem } from "@features/internal/post-detail-panel/components/post-activity-feed";
import { PostDetailBody, type Tab } from "@features/internal/post-detail-panel/components/post-detail-body";
import { PostDetailHeader } from "@features/internal/post-detail-panel/components/post-detail-header";
import { PostDetailPageSkeleton } from "@features/internal/post-detail-panel/components/post-detail-page-skeleton";
import { PostMergeDialog } from "@features/internal/post-detail-panel/components/post-merge-dialog";
import { useCommentActions } from "@features/internal/post-detail-panel/hooks/use-comment-actions";
import { useIntegrationLinks } from "@features/internal/post-detail-panel/hooks/use-integration-links";
import { useMergeActions } from "@features/internal/post-detail-panel/hooks/use-merge-actions";
import { useOwnerPicker } from "@features/internal/post-detail-panel/hooks/use-owner-picker";
import { usePostData } from "@features/internal/post-detail-panel/hooks/use-post-data";
import { useVoteStatus } from "@features/internal/post-detail-panel/hooks/use-vote-status";
import type { Segment } from "@features/internal/segmentation/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { feedbackPosts } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/$postId";

export const handle = { hideSidebar: true };

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `${data?.postTitle ?? "Feedback"} — Feeduro` }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

  const post = await db.query.feedbackPosts.findFirst({
    where: and(
      eq(feedbackPosts.id, params.postId),
      eq(feedbackPosts.organizationId, organizationId),
    ),
    columns: { title: true },
  });

  if (!post) throw new Response("Not found", { status: 404 });

  return {
    postTitle: post.title,
    orgSlug: params.orgSlug,
    postId: params.postId,
  };
}

export default function FeedbackDetailPage({ loaderData }: Route.ComponentProps) {
  const { orgSlug, postId } = loaderData;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const initializedRef = useRef(false);

  const onDataChange = () => qc.invalidateQueries({ queryKey: ["feedback"] });
  const onClose = () => navigate(`/${orgSlug}/dashboard`);
  const onOpenPost = (id: string) => navigate(`/${orgSlug}/feedback/${id}`);

  const { detailData, isLoading, comments: commentList, activities } = usePostData(postId);
  const vote = useVoteStatus(postId, onDataChange);
  const comments = useCommentActions(postId, onDataChange);
  const merge = useMergeActions({ postId, initializedRef, onDataChange, onOpenPost, onClose });
  const integrations = useIntegrationLinks(postId);
  const owner = useOwnerPicker(postId, onDataChange);
  const [activeTab, setActiveTab] = useState<Tab>("comments");

  const { data: segmentsData } = useQuery({
    queryKey: ["segments", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/segments");
      return res.json() as Promise<{ segments: Segment[] }>;
    },
  });
  const segments = segmentsData?.segments ?? [];

  const post = detailData?.postDetail;
  const isAdmin = detailData?.currentRole === "admin";

  const { mutate: deletePost } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "delete", id: postId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Delete failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback"] });
      toast.success("Post deleted");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to delete post"),
  });

  // Mirror PostDetailPanel's initialization pattern
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

  const feed: FeedItem[] = [
    ...commentList.map((c) => ({
      kind: "comment" as const,
      data: c,
      createdAt: c.createdAt,
      isPinned: c.isPinned,
    })),
    ...activities.map((a) => ({
      kind: "activity" as const,
      data: a,
      createdAt: a.createdAt,
      isPinned: false as const,
    })),
  ];
  const totalComments = commentList.reduce((acc, c) => acc + 1 + c.replies.length, 0);

  if (isLoading || !post || !detailData) {
    return <PostDetailPageSkeleton />;
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <PostDetailHeader
        orgSlug={orgSlug}
        postId={postId}
        postTitle={post.title}
        isAdmin={isAdmin}
        hasMergedInto={!!post.mergedIntoPostId}
        vote={vote}
        owner={owner}
        onMergeOpen={merge.openMergeDialog}
        onDeletePost={() => deletePost()}
        onClose={onClose}
        fullPage
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
        fullPage
      />
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
    </div>
  );
}
