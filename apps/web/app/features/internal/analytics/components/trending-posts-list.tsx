import { cn } from "@lib/utils";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { TrendingPosts } from "../schemas/analytics";

const STATUS_COLOR: Record<string, string> = {
  open: "bg-blue-500",
  reviewing: "bg-yellow-400",
  planned: "bg-purple-500",
  "in-progress": "bg-orange-500",
  completed: "bg-green-600",
  closed: "bg-slate-400",
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  reviewing: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/30",
  planned: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
  "in-progress": "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
  completed: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30",
  closed: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  reviewing: "Reviewing",
  planned: "Planned",
  "in-progress": "In Progress",
  completed: "Completed",
  closed: "Closed",
};

interface TrendingPostsListProps {
  posts: TrendingPosts;
}

export function TrendingPostsList({ posts }: TrendingPostsListProps) {
  if (posts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No new votes in the past 7 days.
      </p>
    );
  }

  return (
    <ul className="relative">
      {posts.map((post, i) => {
        const isLast = i === posts.length - 1;
        const dot = STATUS_COLOR[post.status] ?? STATUS_COLOR.closed;
        const badge = STATUS_BADGE[post.status] ?? STATUS_BADGE.closed;
        const label = STATUS_LABEL[post.status] ?? post.status;
        const diff = post.votesThisWeek - post.votesLastWeek;

        return (
          <li key={post.id} className="relative flex gap-4 pb-5 last:pb-0">
            {/* thread line */}
            <div className="relative flex flex-col items-center self-stretch">
              <span className={cn("relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background", dot)} />
              {!isLast && <span className="absolute top-4 -bottom-5 w-px bg-border" />}
            </div>

            {/* content */}
            <div className="flex flex-1 items-start justify-between gap-4 min-w-0">
              <p className="text-sm leading-snug pt-0.5 truncate">{post.title}</p>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs tabular-nums text-muted-foreground">
                  {post.votesThisWeek}w · {post.votesLastWeek}lw
                </span>
                {diff > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                ) : diff < 0 ? (
                  <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                ) : (
                  <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className={cn("rounded border px-1.5 py-0.5 text-xs font-medium", badge)}>
                  {label}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
