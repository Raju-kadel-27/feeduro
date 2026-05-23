import type { ChangelogEngagement } from "../schemas/reports";

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

interface ChangelogEngagementProps {
  entries: ChangelogEngagement;
}

export function ChangelogEngagementList({ entries }: ChangelogEngagementProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No published changelog entries yet.
      </p>
    );
  }

  const maxViews = Math.max(...entries.map((e) => e.totalViews), 1);

  return (
    <div className="space-y-2.5">
      {entries.map((entry) => {
        const pct = Math.round((entry.totalViews / maxViews) * 100);
        return (
          <div key={entry.changelogId} className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span
                className="flex-1 text-[13px] text-foreground truncate"
                title={entry.title}
              >
                {entry.title}
              </span>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                {entry.publishedAt ? formatDate(entry.publishedAt) : "—"}
              </span>
              <span className="text-xs tabular-nums font-semibold text-foreground shrink-0 w-12 text-right">
                {entry.totalViews}
              </span>
              <span className="text-[11px] tabular-nums text-muted-foreground shrink-0 w-14 text-right">
                {entry.uniqueReaders} uniq
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
