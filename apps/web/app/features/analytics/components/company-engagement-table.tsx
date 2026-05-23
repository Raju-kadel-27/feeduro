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
    <div className="space-y-0">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-3 px-2 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide border-b">
        <span>Domain</span>
        <span className="text-right w-10">Users</span>
        <span className="text-right w-10">Posts</span>
        <span className="text-right w-10">Votes</span>
        <span className="text-right w-16">Comments</span>
        <span className="text-right w-20">Last active</span>
      </div>
      {companies.map((co) => (
        <div
          key={co.domain}
          className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-3 items-center px-2 py-2 text-sm border-b last:border-0 hover:bg-muted/30 transition-colors"
        >
          <span className="font-medium text-foreground truncate" title={co.domain}>
            {co.domain}
          </span>
          <span className="text-right w-10 tabular-nums text-muted-foreground">{co.userCount}</span>
          <span className="text-right w-10 tabular-nums text-muted-foreground">{co.postsSubmitted}</span>
          <span className="text-right w-10 tabular-nums text-muted-foreground">{co.votesCast}</span>
          <span className="text-right w-16 tabular-nums text-muted-foreground">{co.commentsLeft}</span>
          <span className="text-right w-20 text-[11px] text-muted-foreground whitespace-nowrap">
            {co.lastActive ? formatDate(co.lastActive) : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
