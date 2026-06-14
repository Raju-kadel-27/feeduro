import { cn } from "@lib/utils";

interface EndpointHeaderProps {
  name: string | null;
  url: string;
  lastDeliveryAt: Date | null;
  lastDeliveryStatus: number | null;
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function EndpointHeader({ name, url, lastDeliveryAt, lastDeliveryStatus }: EndpointHeaderProps) {
  const isSuccess =
    lastDeliveryStatus !== null && lastDeliveryStatus >= 200 && lastDeliveryStatus < 300;
  const hasFailed = lastDeliveryAt !== null && !isSuccess;

  return (
    <div className="min-w-0 space-y-0.5">
      {name && <p className="text-sm font-medium text-foreground truncate">{name}</p>}
      <code className="text-xs font-mono text-muted-foreground break-all leading-snug block">
        {url}
      </code>
      {lastDeliveryAt && (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs",
            isSuccess ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
          )}
        >
          <span
            className={cn(
              "inline-block w-1.5 h-1.5 rounded-full",
              isSuccess ? "bg-emerald-500" : "bg-destructive",
            )}
          />
          {hasFailed
            ? `Failed ${formatRelativeTime(lastDeliveryAt)}`
            : `Delivered ${formatRelativeTime(lastDeliveryAt)}`}
          {lastDeliveryStatus !== null && (
            <span className="text-muted-foreground">({lastDeliveryStatus})</span>
          )}
        </span>
      )}
    </div>
  );
}
