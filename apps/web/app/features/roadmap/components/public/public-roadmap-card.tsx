import type { PublicPost, SessionUser } from "@features/feedback/schemas/public";
import { VoteResponseSchema } from "@features/feedback/schemas/public";
import { cn } from "@lib/utils";
import { ChevronUp, MessageSquare } from "lucide-react";
import { useState } from "react";

export function PublicRoadmapCard({
  post,
  orgSlug,
  initialVoted,
  sessionUser,
  onAuthRequired,
}: {
  post: PublicPost;
  orgSlug: string;
  initialVoted: boolean;
  sessionUser: SessionUser | null;
  onAuthRequired: () => void;
}) {
  const [voted, setVoted] = useState(initialVoted);
  const [voteCount, setVoteCount] = useState(post.voteCount);
  const [voting, setVoting] = useState(false);

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
    <article className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors -mx-1 px-1">
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-medium leading-snug text-foreground">
          {post.title}
        </h3>
        <div className="mt-0.5 flex items-center gap-1 text-muted-foreground">
          <MessageSquare className="h-2.5 w-2.5" />
          <span className="text-[12px]">{post.commentCount}</span>
          <span className="mx-0.5 text-border">·</span>
          <span className="text-[12px] truncate">{post.boardName}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleVote}
        disabled={voting}
        aria-label={voted ? "Remove vote" : "Upvote"}
        className={cn(
          "group/vote flex flex-col items-center justify-center rounded-none border w-8 py-1 shrink-0 transition-all disabled:opacity-60",
          voted
            ? "border-foreground/50 bg-muted text-foreground"
            : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
        )}
      >
        <ChevronUp className="h-3.5 w-3.5 transition-transform duration-150 group-hover/vote:-translate-y-0.5" strokeWidth={2} />
        <span className="text-[12px] font-bold leading-none mt-0.5">{voteCount}</span>
      </button>
    </article>
  );
}
