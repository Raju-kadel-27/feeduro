import type { ChangelogEngagement } from "../schemas/reports";

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

  return (
    <table className="w-full text-sm">
      <colgroup>
        <col />
        <col className="w-28" />
        <col className="w-16" />
        <col className="w-24" />
      </colgroup>
      <thead>
        <tr className="border-b">
          <th className="pb-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Title</th>
          <th className="pb-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Published</th>
          <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Views</th>
          <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Unique Readers</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {entries.map((entry) => (
          <tr key={entry.changelogId} className="hover:bg-muted/40 transition-colors">
            <td className="py-3 pr-6 text-foreground max-w-0">
              <span className="block truncate" title={entry.title}>
                {entry.title}
              </span>
            </td>
            <td className="py-3 pr-6 text-muted-foreground whitespace-nowrap">
              {entry.publishedAt ? formatDate(entry.publishedAt) : "—"}
            </td>
            <td className="py-3 text-right tabular-nums font-medium">
              {entry.totalViews.toLocaleString()}
            </td>
            <td className="py-3 text-right tabular-nums text-muted-foreground">
              {entry.uniqueReaders.toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
