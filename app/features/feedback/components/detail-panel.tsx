import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@components/ui/sheet";
import { cn } from "@lib/utils";
import { ArrowUp } from "lucide-react";
import { useState } from "react";
import { BOARD_COLORS } from "../constants";
import { VoteResponseSchema } from "../schemas/public";
import type { PublicPost, SessionUser } from "../schemas/public";
import { StatusPill } from "./status-pill";

export function DetailPanel({
  post,
  orgSlug,
  onClose,
  initialVoted,
  sessionUser,
  onAuthRequired,
}: {
  post: PublicPost | null;
  orgSlug: string;
  onClose: () => void;
  initialVoted: boolean;
  sessionUser: SessionUser | null;
  onAuthRequired: () => void;
}) {
  const [voted, setVoted] = useState(initialVoted);
  const [voteCount, setVoteCount] = useState(post?.voteCount ?? 0);
  const [voting, setVoting] = useState(false);

  if (!post) return null;
  const postId = post.id;

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
        body: JSON.stringify({ postId, orgSlug }),
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
    <Sheet open={!!post} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-[480px] lg:max-w-[980px] p-0 transition-none"
      >
        <SheetHeader className="border-b border-slate-100 px-6 py-4 space-y-3">
          <div className="flex items-center gap-2 text-[12.5px] text-slate-600">
            <span className="font-medium text-slate-900">{post.authorName}</span>
            <span className="inline-flex items-center gap-1 rounded border border-slate-200 px-1.5 py-px text-[11.5px] text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: BOARD_COLORS[0] }} />
              {post.boardName}
            </span>
          </div>
          <SheetTitle className="text-lg font-semibold leading-snug text-slate-900">
            {post.title}
          </SheetTitle>
          <div>
            <StatusPill id={post.status} />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto px-6 py-4">
          <p className="text-sm leading-relaxed text-slate-700">{post.description}</p>

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleVote}
              disabled={voting}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border h-16 w-16 transition-all disabled:opacity-60 shrink-0 border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
                voted && "border-slate-900",
              )}
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
              <span className="text-xs font-bold leading-none mt-1">{voteCount}</span>
            </button>
            <div>
              <p className="text-[12.5px] font-medium text-slate-900">
                {voteCount} {voteCount === 1 ? "person" : "people"} upvoted
              </p>
              <p className="text-[12px] text-slate-600 mt-1">
                {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
              </p>
            </div>
          </div>

          <div className="my-6 h-px bg-slate-100" />

          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Comments
          </div>
          <div className="py-8 text-center text-[13px] text-slate-500">
            Comment section would display here
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-4 bg-white shrink-0">
          <input
            type="text"
            placeholder="Add a comment..."
            className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-[12.5px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
