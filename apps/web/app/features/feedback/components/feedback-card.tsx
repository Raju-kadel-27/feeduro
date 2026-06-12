import { cn } from "@lib/utils";
import { ChevronUp, MessageSquare } from "lucide-react";
import { useState } from "react";
import { STATUS } from "../constants";
import type { PublicPost, SessionUser } from "../schemas/public";
import { VoteResponseSchema } from "../schemas/public";

export function FeedbackCard({
  post,
  orgSlug,
  initialVoted,
  sessionUser,
  onAuthRequired,
  onSelectPost,
}: {
  post: PublicPost;
  orgSlug: string;
  initialVoted: boolean;
  sessionUser: SessionUser | null;
  onAuthRequired: () => void;
  onSelectPost: () => void;
}) {
  const [voted, setVoted] = useState(initialVoted);
  const [voteCount, setVoteCount] = useState(post.voteCount);
  const [voting, setVoting] = useState(false);

  const status = STATUS[post.status];

  async function handleVote() {
    if (!sessionUser) { onAuthRequired(); return; }
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
      if (!res.ok || !parsed.success) throw new Error("Vote failed");
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
      role="button"
      tabIndex={0}
      onClick={onSelectPost}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectPost();
        }
      }}
      className={cn(
        "group relative flex overflow-hidden rounded-lg border bg-card",
        "transition-all duration-150 cursor-pointer select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        voted
          ? "border-border/80 hover:border-primary/30 hover:shadow-[0_2px_8px_hsl(var(--primary)/0.08)]"
          : "border-border/50 hover:border-border hover:shadow-sm",
      )}
    >
      {/* Status accent strip */}
      <div
        className={cn(
          "w-[3px] shrink-0 transition-opacity duration-200",
          voted ? "opacity-100" : "opacity-40 group-hover:opacity-70",
        )}
        style={{ backgroundColor: status.dot }}
      />

      {/* Card content */}
      <div className="flex flex-col gap-0 px-3 pt-2.5 pb-2 flex-1 min-w-0">

        {/* ── Content zone ── */}
        <div className="flex flex-col gap-1.5 pb-2.5">
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-150">
            {post.title}
          </h3>

          {post.description && (
            <p className="text-[12px] leading-relaxed text-muted-foreground line-clamp-1">
              {post.description}
            </p>
          )}

          {post.boardName && (
            <span className="inline-flex self-start items-center gap-1 px-1.5 py-[3px] rounded text-[10px] font-medium bg-muted/60 text-muted-foreground border border-border/50 leading-none">
              {post.boardName}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border/50 -mx-3" />

        {/* ── Metadata zone ── */}
        <div className="flex items-center gap-1.5 pt-2">
          {/* Status pill */}
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-[3px] rounded leading-none"
            style={{ background: status.bg, color: status.fg }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ background: status.dot }}
            />
            {status.label}
          </span>

          {/* Comment count */}
          {post.commentCount > 0 && (
            <span
              aria-label={`${post.commentCount} comments`}
              className="inline-flex items-center gap-0.5 text-xs tabular-nums text-muted-foreground/70"
            >
              <MessageSquare className="h-3 w-3" />
              {post.commentCount}
            </span>
          )}

          {/* Vote button — primary action */}
          <button
            type="button"
            disabled={voting}
            onClick={(e) => {
              e.stopPropagation();
              handleVote();
            }}
            aria-label={voted ? "Remove vote" : "Upvote this post"}
            aria-pressed={voted}
            className={cn(
              "ml-auto inline-flex items-center gap-0.5 text-xs tabular-nums font-semibold rounded px-1.5 py-0.5",
              "transition-all duration-150 active:scale-95 disabled:pointer-events-none",
              voted
                ? "bg-primary/10 text-primary hover:bg-primary/20"
                : "bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary",
            )}
          >
            <ChevronUp
              className={cn(
                "h-3 w-3 transition-transform duration-150",
                voted && "-translate-y-px",
              )}
            />
            {voteCount}
          </button>
        </div>
      </div>
    </article>
  );
}
