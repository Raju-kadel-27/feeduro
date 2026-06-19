import type { ColumnDef } from "@tanstack/react-table";
import type { AuditLogRow } from "../server/queries";

const ACTION_LABELS: Record<string, string> = {
  api_key_created: "API Key Created",
  api_key_deleted: "API Key Deleted",
  sso_configured: "SSO Configured",
  sso_deleted: "SSO Deleted",
  member_invited: "Member Invited",
  invitation_cancelled: "Invitation Cancelled",
  member_removed: "Member Removed",
  widget_secret_rotated: "Widget Secret Rotated",
  widget_token_regenerated: "Widget Token Regenerated",
};

const ACTION_CLASS: Record<string, string> = {
  api_key_created: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  sso_configured: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  member_invited: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  widget_token_regenerated: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  api_key_deleted: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  sso_deleted: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  member_removed: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  widget_secret_rotated: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  invitation_cancelled: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

const AVATAR_COLORS = [
  "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h * 31) + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function getAvatarColor(email: string): string {
  return AVATAR_COLORS[hashString(email) % AVATAR_COLORS.length];
}

function toDate(val: Date | string): Date {
  return val instanceof Date ? val : new Date(val);
}

function formatAbsolute(val: Date | string): string {
  return toDate(val).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(val: Date | string): string {
  const date = toDate(val);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return toDate(val).toLocaleDateString();
}

function getInitial(name: string | null | undefined, email: string): string {
  return (name ?? email).slice(0, 1).toUpperCase();
}

export const auditLogColumns: ColumnDef<AuditLogRow>[] = [
  {
    accessorKey: "createdAt",
    header: "When",
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        <p className="text-sm font-medium">{formatRelative(row.original.createdAt)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{formatAbsolute(row.original.createdAt)}</p>
      </div>
    ),
  },
  {
    accessorKey: "actorEmail",
    header: "Actor",
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <div
          className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${getAvatarColor(row.original.actorEmail)}`}
        >
          <span className="text-xs font-semibold">
            {getInitial(row.original.actorName, row.original.actorEmail)}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium">{row.original.actorEmail}</p>
          {row.original.actorName && (
            <p className="text-xs text-muted-foreground mt-0.5">{row.original.actorName}</p>
          )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => {
      const cls =
        ACTION_CLASS[row.original.action] ??
        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      const label = ACTION_LABELS[row.original.action] ?? row.original.action;
      return (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>
          {label}
        </span>
      );
    },
  },
  {
    accessorKey: "targetType",
    header: "Target",
    cell: ({ row }) => {
      const { targetType, targetId } = row.original;
      if (!targetType) return <span className="text-muted-foreground text-sm">—</span>;
      return (
        <div className="text-sm">
          <span className="capitalize">{targetType.replace(/_/g, " ")}</span>
          {targetId && (
            <span className="ml-1.5 text-xs text-muted-foreground font-mono">
              {targetId.slice(0, 8)}…
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "ipAddress",
    header: "IP Address",
    cell: ({ row }) =>
      row.original.ipAddress ? (
        <span className="text-sm font-mono text-muted-foreground">{row.original.ipAddress}</span>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      ),
  },
];
