import { cn } from "@lib/utils";
import type { StatusChangeFeed } from "../schemas/analytics";

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

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  return (
    <span className={cn("px-1.5 py-0.5 text-xs rounded border font-medium", STATUS_BADGE[status] ?? "bg-muted text-muted-foreground border-border")}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Props {
  feed: StatusChangeFeed;
}

export function StatusChangeFeedList({ feed }: Props) {
  if (feed.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No status changes in this period.</p>;
  }

  return (
    <div className="divide-y">
      {feed.map((event, i) => (
        <div key={`${event.postId}-${event.changedAt}-${i}`} className="flex items-start gap-3 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{event.postTitle}</p>
            <p className="text-xs text-muted-foreground">{event.boardName}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={event.fromStatus} />
            <span className="text-xs text-muted-foreground">→</span>
            <StatusBadge status={event.toStatus} />
          </div>
          <div className="text-right shrink-0 w-28">
            <p className="text-xs text-muted-foreground">{event.actorName ?? event.actorEmail ?? "System"}</p>
            <p className="text-xs text-muted-foreground">{relativeTime(event.changedAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
