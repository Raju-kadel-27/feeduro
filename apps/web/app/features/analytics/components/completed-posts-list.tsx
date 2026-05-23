import type { CompletedPosts } from "../schemas/analytics";

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

interface CompletedPostsListProps {
  posts: CompletedPosts;
  rangeLabel?: string;
}

export function CompletedPostsList({ posts, rangeLabel }: CompletedPostsListProps) {
  if (posts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        {rangeLabel
          ? `No posts completed in the ${rangeLabel}.`
          : "No posts completed yet."}
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {posts.map((post) => (
        <div key={post.id} className="flex items-center gap-3 py-1">
          <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
          <span className="flex-1 text-sm text-foreground truncate" title={post.title}>
            {post.title}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground shrink-0">
            {post.voteCount}v
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {formatDate(post.completedAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
