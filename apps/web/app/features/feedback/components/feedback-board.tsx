import { Skeleton } from "@components/ui/skeleton";
import { cn } from "@lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronUp, MessageSquare, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { CreateFeedbackDialog } from "./create-feedback-dialog";

type Status = "open" | "reviewing" | "planned" | "in-progress" | "completed" | "closed";

interface Post {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  createdAt: string;
  voteCount: number;
  hasVoted: boolean;
  commentCount: number;
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; dot: string }> = {
  open: {
    label: "Pending",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-muted-foreground",
  },
  reviewing: {
    label: "Reviewing",
    color: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    dot: "bg-orange-500",
  },
  planned: {
    label: "Planned",
    color: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  "in-progress": {
    label: "In Progress",
    color: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  completed: {
    label: "Completed",
    color: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    dot: "bg-green-500",
  },
  closed: {
    label: "Closed",
    color: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    dot: "bg-red-400",
  },
};

function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
        cfg.color,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function VoteButton({ post, boardId }: { post: Post; boardId: string }) {
  const qc = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      return res.json() as Promise<{ voted: boolean }>;
    },
    onMutate: async () => {
      const key = ["feedback", boardId];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<{ posts: Post[] }>(key);
      qc.setQueryData<{ posts: Post[] }>(key, (old) => {
        if (!old) return old;
        return {
          posts: old.posts.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  hasVoted: !p.hasVoted,
                  voteCount: p.hasVoted ? p.voteCount - 1 : p.voteCount + 1,
                }
              : p,
          ),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["feedback", boardId], ctx.prev);
    },
  });

  return (
    <button
      type="button"
      onClick={() => mutate()}
      disabled={isPending}
      className={cn(
        "group/vote flex flex-col items-center justify-center gap-0.5 w-10 rounded-md border px-1 py-1.5 text-xs font-semibold transition-colors",
        post.hasVoted
          ? "border-primary bg-primary/10 text-primary"
          : "border-border hover:border-primary hover:text-primary",
      )}
    >
      <ChevronUp className="h-3.5 w-3.5 transition-transform duration-150 group-hover/vote:-translate-y-0.5" />
      <span>{post.voteCount}</span>
    </button>
  );
}

function PostCard({ post, boardId }: { post: Post; boardId: string }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:border-primary/40 transition-colors group">
      {/* Stop vote clicks from navigating */}
      <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <VoteButton post={post} boardId={boardId} />
      </div>
      <Link
        to={`/${orgSlug}/feedback/${post.id}`}
        className="flex-1 min-w-0 space-y-1 cursor-pointer"
      >
        <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors">
          {post.title}
        </p>
        {post.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{post.description}</p>
        )}
        <div className="flex items-center gap-2 pt-0.5">
          <StatusBadge status={post.status} />
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            {post.commentCount}
          </span>
        </div>
      </Link>
    </div>
  );
}

interface Props {
  boardId: string;
}

export function FeedbackBoard({ boardId }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [activeStatus, setActiveStatus] = useState<Status | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["feedback", boardId, activeStatus],
    queryFn: async () => {
      const url = new URL("/api/feedback", window.location.origin);
      url.searchParams.set("boardId", boardId);
      if (activeStatus) url.searchParams.set("status", activeStatus);
      const res = await fetch(url.toString());
      return res.json() as Promise<{ posts: Post[] }>;
    },
  });

  const posts = data?.posts ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveStatus(null)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              !activeStatus
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground",
            )}
          >
            All
          </button>
          {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setActiveStatus(s)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                activeStatus === s
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground",
              )}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New request
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-lg border">
              <Skeleton className="h-14 w-10 rounded-md shrink-0" />
              <div className="flex-1 space-y-2 pt-0.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex items-center gap-2 pt-0.5">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-8" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No feedback yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Be the first to submit a feature request or bug report.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Submit feedback
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} boardId={boardId} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateFeedbackDialog boardId={boardId} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
