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
      <thead>
        <tr className="border-b">
          <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Title</th>
          <th className="pb-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Published</th>
          <th className="pb-2 text-right text-xs font-medium text-muted-foreground">Views</th>
          <th className="pb-2 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">Unique Readers</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {entries.map((entry) => (
          <tr key={entry.changelogId} className="hover:bg-muted/40 transition-colors">
            <td className="py-2.5 pr-4 text-foreground max-w-0 w-full">
              <span className="block truncate" title={entry.title}>
                {entry.title}
              </span>
            </td>
            <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
              {entry.publishedAt ? formatDate(entry.publishedAt) : "—"}
            </td>
            <td className="py-2.5 pr-4 text-right tabular-nums font-medium">
              {entry.totalViews.toLocaleString()}
            </td>
            <td className="py-2.5 text-right tabular-nums text-muted-foreground">
              {entry.uniqueReaders.toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
