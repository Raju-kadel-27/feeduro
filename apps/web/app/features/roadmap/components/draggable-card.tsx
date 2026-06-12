import { Badge } from "@components/ui/badge";
import { Spinner } from "@components/ui/spinner";
import { useSortable } from "@dnd-kit/react/sortable";
import { cn } from "@lib/utils";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronUp,
  GitBranch,
  GripVertical,
  MessageSquare,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import type { Post, Status } from "../types";

export function DraggableCard({
  post,
  index,
  column,
  hasGithubIntegration,
  onIssueCreated,
}: {
  post: Post;
  index: number;
  column: Status;
  hasGithubIntegration: boolean;
  onIssueCreated: (postId: string, issueNumber: number, issueUrl: string) => void;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const { ref, isDragging } = useSortable({
    id: post.id,
    index,
    type: "item",
    accept: ["item"],
    group: column,
  });

  // Optimistic vote state
  const [voted, setVoted] = useState(post.hasVoted);
  const [voteCount, setVoteCount] = useState(post.voteCount);
  useEffect(() => {
    setVoted(post.hasVoted);
    setVoteCount(post.voteCount);
  }, [post.hasVoted, post.voteCount]);

  const { mutate: toggleVote, isPending: isVoting } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      if (!res.ok) throw new Error("Failed to vote");
      return res.json() as Promise<{ voted: boolean }>;
    },
    onMutate: () => {
      const next = !voted;
      setVoted(next);
      setVoteCount((c) => Math.max(0, next ? c + 1 : c - 1));
    },
    onError: () => {
      setVoted(post.hasVoted);
      setVoteCount(post.voteCount);
      toast.error("Failed to update vote");
    },
  });

  const { mutate: createIssue, isPending: creatingIssue } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create_issue", postId: post.id }),
      });
      const json = (await res.json()) as {
        error?: string;
        issue?: { number: number; html_url: string };
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to create issue");
      return json.issue!;
    },
    onSuccess: (issue) => {
      toast.success(`GitHub issue #${issue.number} created`);
      onIssueCreated(post.id, issue.number, issue.html_url);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/${orgSlug}/feedback/${post.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/${orgSlug}/feedback/${post.id}`);
        }
      }}
      className={cn(
        "group relative flex h-[138px] overflow-hidden rounded-lg bg-card shadow-sm",
        "transition-all duration-150 cursor-grab active:cursor-grabbing select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "hover:shadow-sm",
        isDragging && "opacity-30",
      )}
    >

      {/* Card content */}
      <div className="flex flex-col justify-between px-3 pt-2.5 pb-2 flex-1 min-w-0">

        {/* Drag affordance */}
        <GripVertical className="absolute top-2.5 right-2 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-25 transition-opacity pointer-events-none" />

        {/* ── Content zone ── */}
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold leading-snug line-clamp-2 text-foreground pr-5 group-hover:text-primary transition-colors duration-150">
            {post.title}
          </p>

          {post.boardName && (
            <Badge variant="secondary" className="self-start text-[10px] px-1.5 py-0.5 rounded">
              {post.boardName}
            </Badge>
          )}
        </div>

        {/* ── Bottom zone — always pinned to bottom via justify-between ── */}
        <div className="shrink-0">
          {/* Metadata row */}
          <div className="flex items-center mt-2 mb-1">
            {/* Vote button — extreme left */}
            <button
              type="button"
              disabled={isVoting}
              onClick={(e) => {
                e.stopPropagation();
                toggleVote();
              }}
              aria-label={voted ? "Remove vote" : "Upvote this post"}
              aria-pressed={voted}
              className={cn(
                "inline-flex items-center gap-0.5 text-xs tabular-nums font-semibold rounded px-1.5 py-0.5",
                "transition-all duration-150 active:scale-95 disabled:pointer-events-none",
                voted
                  ? "bg-primary/12 text-primary hover:bg-primary/20"
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

            {/* Comment count + GitHub + avatar — extreme right */}
            <div className="flex items-center gap-1.5 ml-auto">
            {post.commentCount > 0 && (
              <span
                aria-label={`${post.commentCount} comments`}
                className="inline-flex items-center gap-0.5 text-xs tabular-nums text-muted-foreground/70"
              >
                <MessageSquare className="h-3 w-3" />
                {post.commentCount}
              </span>
            )}

            {/* GitHub integration */}
            <div role="none" onClick={(e) => e.stopPropagation()}>
              {post.githubIssueNumber ? (
                <a
                  href={post.githubIssueUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`GitHub issue #${post.githubIssueNumber}`}
                  className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60 hover:text-muted-foreground border border-border/50 rounded px-1.5 py-0.5 hover:bg-muted/40 transition-colors"
                >
                  <GitBranch className="h-2.5 w-2.5" />
                  #{post.githubIssueNumber}
                </a>
              ) : (
                hasGithubIntegration && (
                  <button
                    type="button"
                    disabled={creatingIssue}
                    onClick={() => createIssue()}
                    aria-label="Create GitHub issue"
                    className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border/50 rounded px-1.5 py-0.5 hover:bg-muted/40 transition-all"
                  >
                    {creatingIssue ? (
                      <Spinner className="size-2.5" />
                    ) : (
                      <GitBranch className="h-2.5 w-2.5" />
                    )}
                    {creatingIssue ? "Creating…" : "Link issue"}
                  </button>
                )
              )}
            </div>

            {/* Author avatar */}
            {post.authorImage ? (
              <img
                src={post.authorImage}
                alt={post.authorName ?? ""}
                title={post.authorName ?? undefined}
                className="h-6 w-6 rounded-full object-cover shrink-0 opacity-80"
              />
            ) : (
              <div
                title={post.authorName ?? undefined}
                className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-semibold text-muted-foreground shrink-0"
              >
                {post.authorName?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
