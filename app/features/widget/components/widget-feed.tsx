import { StatusPill } from "./status-pill";
import type { WidgetPost } from "../types";

interface WidgetFeedProps {
  posts: WidgetPost[];
}

export function WidgetFeed({ posts }: WidgetFeedProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-1 text-muted-foreground">
        <p className="text-[13px]">No feedback yet.</p>
        <p className="text-[12px] opacity-70">Be the first to share!</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/50">
      {posts.map((post) => (
        <li key={post.id} className="px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13px] font-medium leading-snug line-clamp-2 flex-1">
              {post.title}
            </p>
            <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums mt-px">
              ▲ {post.voteCount}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <StatusPill id={post.status} />
            {post.commentCount > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}