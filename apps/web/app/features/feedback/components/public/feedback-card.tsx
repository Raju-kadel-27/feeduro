import { cn } from "@lib/utils";
import { ChevronUp, MessageSquare } from "lucide-react";
import { useState } from "react";
import { STATUS } from "../../constants";
import type { PublicPost, SessionUser } from "../../schemas/public";
import { VoteResponseSchema } from "../../schemas/public";

export function FeedbackCard({
  post,
  orgSlug,
  initialVoted,
  sessionUser,
  onAuthRequired,
  onSelectPost,
  onMouseEnter,
}: {
  post: PublicPost;
  orgSlug: string;
  initialVoted: boolean;
  sessionUser: SessionUser | null;
  onAuthRequired: () => void;
  onSelectPost: () => void;
  onMouseEnter?: () => void;
}) {
  const [voted, setVoted] = useState(initialVoted);
  const [voteCount, setVoteCount] = useState(post.voteCount);
  const [voting, setVoting] = useState(false);

  async function handleVote() {
    if (!sessionUser) {
      onAuthRequired();
      return;
    }
    if (voting) return;
    const wasVoted = voted;
    setVoted(!wasVoted);
    setVoteCount((c) => (wasVoted ? c - 1 : c + 1));
    setVoting(true);
    try {
      const res = await fetch("/api/public-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, orgSlug }),
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

  return (
    <article
      onClick={onSelectPost}
      onMouseEnter={onMouseEnter}
      className="group flex items-center gap-3 py-2 px-4 -mx-4 border-b border-border/30 last:border-0 cursor-pointer hover:bg-accent/30 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <h3 className="text-[16px] font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
          {post.title}
        </h3>
        {post.description && (
          <p className="mt-0.5 text-[15.5px] leading-relaxed text-muted-foreground line-clamp-1">
            {post.description}
          </p>
        )}
        <div className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground">
          <MessageSquare className="h-2.5 w-2.5" />
          <span className="text-[13px]">{post.commentCount}</span>
          <span className="mx-0.5 text-border">·</span>
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[13px] font-medium"
            style={{ background: STATUS[post.status].bg, color: STATUS[post.status].fg }}
          >
            <span className="h-1 w-1 rounded-full" style={{ background: STATUS[post.status].dot }} />
            {STATUS[post.status].label}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleVote();
        }}
        disabled={voting}
        aria-label={voted ? "Remove vote" : "Upvote"}
        className={cn(
          "group/vote flex flex-col items-center justify-center rounded-none border w-7 py-1 shrink-0 transition-all disabled:opacity-60",
          voted
            ? "border-foreground/50 bg-muted text-foreground"
            : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
        )}
      >
        <ChevronUp className="h-3.5 w-3.5 transition-transform duration-150 group-hover/vote:-translate-y-0.5" strokeWidth={2} />
        <span className="text-[13px] font-bold leading-none mt-0.5">{voteCount}</span>
      </button>
    </article>
  );
}
