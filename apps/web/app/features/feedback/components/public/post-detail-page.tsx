import { FeedbackAvatar } from "@features/feedback/components/feedback-avatar";
import { cn } from "@lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronUp, MoveLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import type { SessionUser } from "../../schemas/public";
import { VoteResponseSchema } from "../../schemas/public";
import { StatusPill } from "../status-pill";
import type { PortalOutletContext } from "./portal-layout";
import { PublicCommentsSection, publicCommentsQueryKey } from "./public-comments-section";
import { PublicComposeFooter } from "./public-compose-footer";

export function PostDetailPage({
  postId,
  context,
}: {
  postId: string;
  context: PortalOutletContext;
}) {
  const { org, posts, votedPostIds, sessionUser, setAuthModal } = context;
  const post = posts.find((p) => p.id === postId) ?? null;

  const queryClient = useQueryClient();
  const [voted, setVoted] = useState(post ? votedPostIds.includes(postId) : false);
  const [voteCount, setVoteCount] = useState(post?.voteCount ?? 0);
  const [voting, setVoting] = useState(false);

  async function handleVote(currentSessionUser: SessionUser | null) {
    if (!currentSessionUser) {
      setAuthModal("sign-in");
      return;
    }
    if (voting || !post) return;
    const wasVoted = voted;
    setVoted(!wasVoted);
    setVoteCount((c) => (wasVoted ? c - 1 : c + 1));
    setVoting(true);
    try {
      const res = await fetch("/api/public-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, orgSlug: org.slug }),
      });
      const parsed = VoteResponseSchema.safeParse(await res.json());
      if (!res.ok || !parsed.success)
        throw new Error(parsed.success ? parsed.data.error : "Vote failed");
      setVoted(parsed.data.voted ?? !wasVoted);
      setVoteCount(parsed.data.voteCount ?? voteCount);
    } catch {
      setVoted(wasVoted);
      setVoteCount((c) => (wasVoted ? c + 1 : c - 1));
    } finally {
      setVoting(false);
    }
  }

  if (!post) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground text-sm">
        Post not found.
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8 pb-16">
      <Link
        to={`/${org.slug}/portal/feedback`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <MoveLeft className="h-3.5 w-3.5" />
        Back to feedback
      </Link>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusPill id={post.status} />
              <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-muted font-medium text-foreground/60">
                {post.boardName}
              </span>
            </div>
            <h1 className="text-xl font-semibold leading-snug">{post.title}</h1>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FeedbackAvatar name={post.authorName} size={16} />
              <span className="font-medium text-foreground/80">{post.authorName}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleVote(sessionUser ?? null)}
            disabled={voting}
            className={cn(
              "group/vote flex flex-col items-center justify-center gap-0.5 w-9 h-9 border-[1.5px] transition-all duration-150 shrink-0 select-none",
              voted
                ? "border-foreground/50 bg-muted text-foreground"
                : "border-border bg-card text-muted-foreground",
              voting && "opacity-50 cursor-not-allowed",
            )}
          >
            <ChevronUp
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-150 group-hover/vote:-translate-y-0.5",
                voted ? "stroke-[2.5]" : "stroke-[1.75]",
              )}
            />
            <span className="text-[12px] font-semibold leading-none tabular-nums">{voteCount}</span>
          </button>
        </div>

        {post.description && (
          <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">
            {post.description}
          </p>
        )}

        <div className="pt-4 border-t space-y-3">
          <h2 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
            Comments
            {post.commentCount > 0 && (
              <span className="ml-1.5 normal-case font-normal">· {post.commentCount}</span>
            )}
          </h2>
          <PublicCommentsSection postId={postId} orgSlug={org.slug} />
        </div>
      </div>

      <div className="mt-6 border-t pt-4">
        <PublicComposeFooter
          postId={postId}
          orgSlug={org.slug}
          sessionUser={sessionUser ?? null}
          onAuthRequired={() => setAuthModal("sign-in")}
          onCommentPosted={() =>
            queryClient.invalidateQueries({
              queryKey: publicCommentsQueryKey(postId, org.slug),
            })
          }
        />
      </div>
    </main>
  );
}
