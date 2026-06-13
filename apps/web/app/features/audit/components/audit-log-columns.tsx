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

function toDate(val: Date | string): Date {
  return val instanceof Date ? val : new Date(val);
}

function formatAbsolute(val: Date | string): string {
  return toDate(val).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
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
      <div title={formatRelative(row.original.createdAt)} className="whitespace-nowrap">
        <p className="text-sm text-foreground/80">{formatAbsolute(row.original.createdAt)}</p>
      </div>
    ),
  },
  {
    accessorKey: "actorEmail",
    header: "Actor",
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-muted-foreground">
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
