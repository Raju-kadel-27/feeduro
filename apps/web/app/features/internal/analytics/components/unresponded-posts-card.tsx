import { AlertTriangle } from "lucide-react";
import type { UnrespondedPosts } from "../schemas/analytics";

interface Props {
  posts: UnrespondedPosts;
}

export function UnrespondedPostsCard({ posts }: Props) {
  if (posts.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-4 dark:border-amber-500/30 dark:bg-amber-500/10">
      {/* Header */}
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div>
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {posts.length} unresponded post{posts.length !== 1 ? "s" : ""}
          </h2>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            Open for 30+ days with no status change — sorted by votes
          </p>
        </div>
      </div>

      {/* Post list */}
      <ul className="space-y-2">
        {posts.map((post) => (
          <li key={post.id} className="flex items-center justify-between gap-3 min-w-0">
            <p className="text-sm text-amber-900 dark:text-amber-100 truncate flex-1">
              {post.title}
            </p>
            <div className="flex shrink-0 items-center gap-3 text-xs text-amber-700 dark:text-amber-400 tabular-nums">
              <span>{post.voteCount} vote{post.voteCount !== 1 ? "s" : ""}</span>
              <span className="text-amber-500">·</span>
              <span>{post.daysOpen}d open</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
