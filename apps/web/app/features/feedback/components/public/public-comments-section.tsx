import { Badge } from "@components/ui/badge";
import { FeedbackAvatar } from "@features/feedback/components/feedback-avatar";
import { useQuery } from "@tanstack/react-query";
import type { PublicComment } from "../../schemas/public";
import { timeAgo } from "../../utils";

export const publicCommentsQueryKey = (postId: string, orgSlug: string) =>
  ["public-comments", postId, orgSlug] as const;

function TeamBadge() {
  return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 leading-none">Team</Badge>;
}

function CommentRow({ comment }: { comment: PublicComment }) {
  const displayName = comment.authorName ?? "Anonymous";
  return (
    <div className="py-2">
      <div className="flex gap-2.5">
        <FeedbackAvatar name={displayName} image={comment.authorImage} size={20} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-xs font-semibold">{displayName}</span>
            {comment.isTeamMember && <TeamBadge />}
            <span className="text-[11px] text-muted-foreground">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
            {comment.body}
          </p>
          {comment.replies.length > 0 && (
            <div className="mt-2 space-y-2 pl-3 border-l-2 border-border/40">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex gap-2">
                  <FeedbackAvatar
                    name={reply.authorName ?? "Anonymous"}
                    image={reply.authorImage}
                    size={16}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-semibold">
                        {reply.authorName ?? "Anonymous"}
                      </span>
                      {reply.isTeamMember && <TeamBadge />}
                      <span className="text-[11px] text-muted-foreground">
                        {timeAgo(reply.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                      {reply.body}
                    </p>
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

async function fetchPublicComments(postId: string, orgSlug: string): Promise<PublicComment[]> {
  const r = await fetch(
    `/api/public-comments?postId=${postId}&orgSlug=${encodeURIComponent(orgSlug)}`,
  );
  const json = (await r.json()) as { comments?: PublicComment[] };
  return json.comments ?? [];
}

export function PublicCommentsSection({
  postId,
  orgSlug,
}: {
  postId: string;
  orgSlug: string;
}) {
  const { data: commentList = [], isLoading } = useQuery({
    queryKey: publicCommentsQueryKey(postId, orgSlug),
    queryFn: () => fetchPublicComments(postId, orgSlug),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <p className="py-4 text-center text-xs text-muted-foreground">Loading…</p>;
  }
  if (commentList.length === 0) {
    return <p className="py-4 text-center text-xs text-muted-foreground">No comments yet.</p>;
  }
  return (
    <div className="divide-y divide-border/40">
      {commentList.map((c) => (
        <CommentRow key={c.id} comment={c} />
      ))}
    </div>
  );
}
