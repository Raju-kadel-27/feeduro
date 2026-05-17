import { cn } from "@lib/utils";
import { ArrowUp, MessageSquare } from "lucide-react";
import { useState } from "react";
import { VoteResponseSchema } from "../schemas/public";
import type { PublicPost, SessionUser } from "../schemas/public";

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
      if (!res.ok || !parsed.success) throw new Error(parsed.success ? parsed.data.error : "Vote failed");
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
      className="group py-4 px-0 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50/50 -mx-4 px-4 transition-colors"
    >
      <div className="flex items-start gap-4">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleVote();
          }}
          disabled={voting}
          aria-label={voted ? "Remove vote" : "Upvote"}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border h-12 w-12 shrink-0 transition-all disabled:opacity-60 border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
            voted && "border-orange-600",
          )}
        >
          <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span className="text-[10px] font-bold leading-none mt-0.5">{voteCount}</span>
        </button>

        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-snug text-slate-900 mb-1">
            {post.title}
          </h3>
          {post.description && (
            <p className="text-[13px] leading-relaxed text-slate-600 line-clamp-2 mb-2">
              {post.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{post.commentCount}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
