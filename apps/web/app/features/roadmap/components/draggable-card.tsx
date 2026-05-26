import { Spinner } from "@components/ui/spinner";
import { useSortable } from "@dnd-kit/react/sortable";
import { cn } from "@lib/utils";
import { useMutation } from "@tanstack/react-query";
import { ChevronUp, ExternalLink, GitBranch, MessageSquare } from "lucide-react";
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
      onClick={() => navigate(`/${orgSlug}/feedback/${post.id}`)}
      className={cn(
        "group flex flex-col gap-2.5 p-3 rounded-lg border border-border/60 bg-card",
        "hover:border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-150",
        "cursor-grab active:cursor-grabbing select-none",
        isDragging && "opacity-30 border-dashed",
      )}
    >
      <p className="text-xs font-medium leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
        {post.title}
      </p>

      {post.boardName && (
        <span className="inline-flex self-start items-center px-1.5 py-0.5 rounded-full text-[10px] border border-border/80 text-muted-foreground font-medium">
          {post.boardName}
        </span>
      )}

      <div className="flex items-center gap-1.5 text-muted-foreground">
        {post.authorImage ? (
          <img
            src={post.authorImage}
            alt={post.authorName ?? ""}
            className="h-5 w-5 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-semibold text-muted-foreground shrink-0">
            {post.authorName?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <span className="inline-flex items-center gap-0.5 text-[10px] tabular-nums bg-muted/70 rounded-full px-1.5 py-0.5">
            <ChevronUp className="h-3 w-3" />
            {post.voteCount}
          </span>
          {post.commentCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] tabular-nums bg-muted/70 rounded-full px-1.5 py-0.5">
              <MessageSquare className="h-2.5 w-2.5" />
              {post.commentCount}
            </span>
          )}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          {post.githubIssueNumber ? (
            <a
              href={post.githubIssueUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              title={`GitHub issue #${post.githubIssueNumber}`}
              className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground border border-border rounded px-1.5 py-0.5 hover:bg-muted/40 transition-colors"
            >
              <GitBranch className="h-2.5 w-2.5" />#{post.githubIssueNumber}
              <ExternalLink className="h-2 w-2" />
            </a>
          ) : (
            hasGithubIntegration && (
              <button
                type="button"
                disabled={creatingIssue}
                onClick={() => createIssue()}
                title="Create GitHub issue"
                className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border rounded px-1.5 py-0.5 hover:bg-muted/40 transition-all"
              >
                {creatingIssue ? (
                  <Spinner className="size-2.5" />
                ) : (
                  <GitBranch className="h-2.5 w-2.5" />
                )}
                {creatingIssue ? "Creating…" : "Create issue"}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
