import { FeedbackAvatar } from "@features/feedback/components/feedback-avatar";
import { cn } from "@lib/utils";
import { ChevronUp, X } from "lucide-react";
import { useState } from "react";
import type { PublicPost, SessionUser } from "../../schemas/public";
import { VoteResponseSchema } from "../../schemas/public";
import { PublicCommentsSection } from "./public-comments-section";
import { PublicComposeFooter } from "./public-compose-footer";
import { StatusPill } from "../status-pill";

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
  const [refreshKey, setRefreshKey] = useState(0);

  if (!post) return null;
  const postId = post.id;

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
        body: JSON.stringify({ postId, orgSlug }),
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
    <>
      <div className="fixed inset-0 z-40 bg-background/30 backdrop-blur-[4px]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-screen w-[780px] max-w-[95vw] z-50 bg-background border-l shadow-2xl flex flex-col overflow-hidden">
        <header className="flex items-center h-12 px-4 border-b shrink-0 gap-2">
          <StatusPill id={post.status} />
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-3 pb-4 max-w-2xl space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap flex-1">
                <FeedbackAvatar name={post.authorName} size={16} />
                <span className="font-medium text-foreground/80">{post.authorName}</span>
                <span>·</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-muted font-medium text-foreground/60">
                  {post.boardName}
                </span>
              </div>
              <button
                type="button"
                onClick={handleVote}
                disabled={voting}
                className={cn(
                  "group/vote flex flex-col items-center justify-center gap-0.5 w-8 h-8 border-[1.5px] transition-all duration-150 shrink-0 select-none",
                  voted
                    ? "border-foreground/50 bg-muted text-foreground"
                    : "border-border bg-card text-muted-foreground",
                  voting && "opacity-50 cursor-not-allowed",
                )}
              >
                <ChevronUp
                  className={cn(
                    "h-3 w-3 transition-transform duration-150 group-hover/vote:-translate-y-0.5",
                    voted ? "stroke-[2.5]" : "stroke-[1.75]",
                  )}
                />
                <span className="text-[10px] font-semibold leading-none tabular-nums">
                  {voteCount}
                </span>
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-semibold leading-snug">{post.title}</h2>
              {post.description && (
                <p className="text-xs text-foreground/60 leading-relaxed whitespace-pre-wrap">
                  {post.description}
                </p>
              )}
            </div>

            <div className="pt-3 space-y-3">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Comments
                {post.commentCount > 0 && (
                  <span className="ml-1.5 normal-case font-normal">· {post.commentCount}</span>
                )}
              </h3>
              <PublicCommentsSection postId={postId} orgSlug={orgSlug} refreshKey={refreshKey} />
            </div>
          </div>
        </div>

        <PublicComposeFooter
          postId={postId}
          orgSlug={orgSlug}
          sessionUser={sessionUser}
          onAuthRequired={onAuthRequired}
          onCommentPosted={() => setRefreshKey((k) => k + 1)}
        />
      </div>
    </>
  );
}
