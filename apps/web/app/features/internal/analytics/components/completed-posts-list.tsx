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
    <table className="w-full text-sm">
      <colgroup>
        <col className="w-4" />
        <col />
        <col className="w-16" />
        <col className="w-24" />
      </colgroup>
      <thead>
        <tr className="border-b">
          <th />
          <th className="pb-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Post</th>
          <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Votes</th>
          <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Completed</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {posts.map((post) => (
          <tr key={post.id} className="hover:bg-muted/30 transition-colors">
            <td className="py-2.5 pr-3">
              <span className="h-2 w-2 rounded-full bg-green-500 block" />
            </td>
            <td className="py-2.5 pr-6 text-foreground max-w-0">
              <span className="block truncate" title={post.title}>{post.title}</span>
            </td>
            <td className="py-2.5 text-right tabular-nums text-muted-foreground text-xs">
              {post.voteCount}
            </td>
            <td className="py-2.5 text-right text-xs text-muted-foreground whitespace-nowrap pl-4">
              {formatDate(post.completedAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
