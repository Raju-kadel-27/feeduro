import { cn } from "@lib/utils";
import { MessageSquare } from "lucide-react";
import type { CommentsAnalytics } from "../schemas/analytics";

const STATUS_BADGE: Record<string, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  reviewing: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/30",
  planned: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
  "in-progress": "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
  completed: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30",
  closed: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open", reviewing: "Reviewing", planned: "Planned",
  "in-progress": "In Progress", completed: "Completed", closed: "Closed",
};

interface Props {
  data: CommentsAnalytics;
  rangeLabel?: string;
}

export function CommentsAnalyticsPanel({ data, rangeLabel }: Props) {
  const { totalComments, delta, topPosts } = data;
  const hasDelta = delta != null;
  const positive = hasDelta && delta >= 0;

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-semibold tabular-nums">
          {totalComments.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">
          total comments{rangeLabel ? ` · ${rangeLabel}` : ""}
        </span>
        {hasDelta && (
          <span className={cn("text-xs font-medium tabular-nums", positive ? "text-emerald-500" : "text-rose-500")}>
            {positive ? "↑" : "↓"} {Math.abs(delta)}% vs prev period
          </span>
        )}
      </div>

      {topPosts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No comments in this period.
        </p>
      ) : (
        <table className="w-full text-sm">
          <colgroup>
            <col />
            <col className="w-28" />
            <col className="w-16" />
          </colgroup>
          <thead>
            <tr className="border-b">
              <th className="pb-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Post</th>
              <th className="pb-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Comments</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {topPosts.map((post) => {
              const badge = STATUS_BADGE[post.status] ?? STATUS_BADGE.closed;
              const label = STATUS_LABEL[post.status] ?? post.status;
              return (
                <tr key={post.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 pr-6 text-foreground max-w-0">
                    <span className="block truncate" title={post.title}>{post.title}</span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", badge)}>
                      {label}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <span className="inline-flex items-center justify-end gap-1 tabular-nums text-muted-foreground text-xs">
                      <MessageSquare className="h-3 w-3" />
                      {post.commentCount}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
