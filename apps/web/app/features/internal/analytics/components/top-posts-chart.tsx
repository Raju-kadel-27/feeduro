import { cn } from "@lib/utils";
import type { TopPost } from "../schemas/reports";

const STATUS_DOT: Record<string, string> = {
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

interface TopPostsChartProps {
  posts: TopPost[];
}

export function TopPostsChart({ posts }: TopPostsChartProps) {
  if (posts.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No posts yet.</p>;
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
          <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {posts.map((post) => {
          const dot = STATUS_DOT[post.status] ?? STATUS_DOT.closed;
          const badge = STATUS_BADGE[post.status] ?? STATUS_BADGE.closed;
          const label = STATUS_LABEL[post.status] ?? post.status;

          return (
            <tr key={post.id} className="hover:bg-muted/30 transition-colors">
              <td className="py-2.5 pr-3">
                <span className={cn("h-2.5 w-2.5 rounded-full block", dot)} />
              </td>
              <td className="py-2.5 pr-6 text-foreground max-w-0">
                <span className="block truncate" title={post.title}>{post.title}</span>
              </td>
              <td className="py-2.5 text-right tabular-nums font-medium text-muted-foreground">
                {post.voteCount}
              </td>
              <td className="py-2.5 text-right">
                <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", badge)}>
                  {label}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
