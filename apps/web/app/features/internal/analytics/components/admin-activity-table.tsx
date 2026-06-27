import type { AdminActivity } from "../schemas/reports";

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  admin: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  member: "bg-gray-50 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300",
};

interface AdminActivityTableProps {
  activity: AdminActivity;
}

export function AdminActivityTable({ activity }: AdminActivityTableProps) {
  if (activity.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No team members found.
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <colgroup>
        <col />
        <col className="w-20" />
        <col className="w-20" />
        <col className="w-24" />
        <col className="w-20" />
      </colgroup>
      <thead>
        <tr className="border-b">
          <th className="pb-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Member</th>
          <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Posts</th>
          <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Votes</th>
          <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Comments</th>
          <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Total</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {activity.map((item) => {
          const total = item.postsSubmitted + item.votesCast + item.commentsLeft;
          return (
            <tr key={item.userId} className="hover:bg-muted/30 transition-colors">
              <td className="py-2.5 pr-6">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-foreground truncate">
                    {item.name ?? item.email ?? "Unknown"}
                  </span>
                  <span
                    className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      ROLE_BADGE[item.role] ?? ROLE_BADGE.member
                    }`}
                  >
                    {item.role}
                  </span>
                </div>
                {item.name && (
                  <span className="text-[11px] text-muted-foreground">{item.email}</span>
                )}
              </td>
              <td className="py-2.5 text-right tabular-nums text-muted-foreground">{item.postsSubmitted}</td>
              <td className="py-2.5 text-right tabular-nums text-muted-foreground">{item.votesCast}</td>
              <td className="py-2.5 text-right tabular-nums text-muted-foreground">{item.commentsLeft}</td>
              <td className="py-2.5 text-right tabular-nums font-semibold text-foreground">{total}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
