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
    <div className="space-y-0">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-2 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide border-b">
        <span>Member</span>
        <span className="text-right w-12">Posts</span>
        <span className="text-right w-12">Votes</span>
        <span className="text-right w-16">Comments</span>
        <span className="text-right w-12">Total</span>
      </div>
      {activity.map((item) => {
        const total = item.postsSubmitted + item.votesCast + item.commentsLeft;
        return (
          <div
            key={item.userId}
            className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center px-2 py-2 text-sm border-b last:border-0 hover:bg-muted/30 transition-colors"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
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
                <span className="text-[11px] text-muted-foreground truncate">{item.email}</span>
              )}
            </div>
            <span className="text-right w-12 tabular-nums text-muted-foreground">{item.postsSubmitted}</span>
            <span className="text-right w-12 tabular-nums text-muted-foreground">{item.votesCast}</span>
            <span className="text-right w-16 tabular-nums text-muted-foreground">{item.commentsLeft}</span>
            <span className="text-right w-12 tabular-nums font-semibold text-foreground">{total}</span>
          </div>
        );
      })}
    </div>
  );
}
