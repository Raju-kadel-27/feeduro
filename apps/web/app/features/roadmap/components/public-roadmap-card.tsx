import type { PublicPost, SessionUser } from "@features/feedback/schemas/public";
import { VoteResponseSchema } from "@features/feedback/schemas/public";
import { avatarColor, getInitials } from "@features/feedback/utils";
import { cn } from "@lib/utils";
import { ArrowUp } from "lucide-react";
import { useState } from "react";

export function PublicRoadmapCard({
  post,
  accentColor,
  orgSlug,
  initialVoted,
  sessionUser,
  onAuthRequired,
}: {
  post: PublicPost;
  accentColor: string;
  orgSlug: string;
  initialVoted: boolean;
  sessionUser: SessionUser | null;
  onAuthRequired: () => void;
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
    <article className="w-full rounded-xl border border-border bg-card p-4 flex flex-col gap-3 hover:shadow-md hover:border-border/80 transition-all">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: accentColor }} />
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {post.boardName}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-[13.5px] font-semibold leading-snug text-foreground line-clamp-2">
          {post.title}
        </h3>
        {post.description && (
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground line-clamp-3">
            {post.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
            style={{ background: avatarColor(post.authorName) }}
          >
            {getInitials(post.authorName)}
          </div>
          <span className="text-[11.5px] text-muted-foreground truncate">{post.authorName}</span>
        </div>
        <button
          type="button"
          onClick={handleVote}
          disabled={voting}
          className={cn(
            "inline-flex items-center gap-1 text-[12px] shrink-0 ml-2 transition-colors disabled:opacity-60",
            voted ? "text-slate-900 hover:text-slate-800" : "text-slate-500 hover:text-slate-900",
          )}
        >
          <ArrowUp
            className={cn("h-3.5 w-3.5 transition-all", voted && "fill-current")}
            strokeWidth={2.5}
          />
          {voteCount}
        </button>
      </div>
    </article>
  );
}
