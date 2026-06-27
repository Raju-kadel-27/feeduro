import type { CompanyEngagement } from "../schemas/reports";

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

interface CompanyEngagementTableProps {
  companies: CompanyEngagement;
}

export function CompanyEngagementTable({ companies }: CompanyEngagementTableProps) {
  if (companies.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No external customer activity yet.
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <colgroup>
        <col />
        <col className="w-16" />
        <col className="w-16" />
        <col className="w-16" />
        <col className="w-20" />
        <col className="w-24" />
      </colgroup>
      <thead>
        <tr className="border-b">
          <th className="pb-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Domain</th>
          <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Users</th>
          <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Posts</th>
          <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Votes</th>
          <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Comments</th>
          <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Last Active</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {companies.map((co) => (
          <tr key={co.domain} className="hover:bg-muted/30 transition-colors">
            <td className="py-2.5 pr-6 font-medium text-foreground truncate max-w-0" title={co.domain}>
              {co.domain}
            </td>
            <td className="py-2.5 text-right tabular-nums text-muted-foreground">{co.userCount}</td>
            <td className="py-2.5 text-right tabular-nums text-muted-foreground">{co.postsSubmitted}</td>
            <td className="py-2.5 text-right tabular-nums text-muted-foreground">{co.votesCast}</td>
            <td className="py-2.5 text-right tabular-nums text-muted-foreground">{co.commentsLeft}</td>
            <td className="py-2.5 text-right text-[11px] text-muted-foreground whitespace-nowrap">
              {co.lastActive ? formatDate(co.lastActive) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
