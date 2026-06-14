import { cn } from "@lib/utils";
import type { EndpointRow } from "../types";
import { EndpointActions } from "./endpoint-actions";
import { EventBadge, formatDate } from "./shared";

function DeliveryCell({
  lastDeliveryAt,
  lastDeliveryStatus,
}: {
  lastDeliveryAt: Date | null;
  lastDeliveryStatus: number | null;
}) {
  if (!lastDeliveryAt) {
    return <span className="text-xs text-muted-foreground/50">Never</span>;
  }

  const isSuccess =
    lastDeliveryStatus !== null && lastDeliveryStatus >= 200 && lastDeliveryStatus < 300;

  const diffMs = Date.now() - new Date(lastDeliveryAt).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  let relative: string;
  if (diffMins < 1) relative = "just now";
  else if (diffMins < 60) relative = `${diffMins}m ago`;
  else if (diffMins < 1440) relative = `${Math.floor(diffMins / 60)}h ago`;
  else relative = `${Math.floor(diffMins / 1440)}d ago`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        isSuccess ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          isSuccess ? "bg-emerald-500" : "bg-destructive",
        )}
      />
      {relative}
      {lastDeliveryStatus !== null && (
        <span className="text-muted-foreground">({lastDeliveryStatus})</span>
      )}
    </span>
  );
}

interface EndpointsTableProps {
  endpoints: EndpointRow[];
  isAdmin: boolean;
  onToggle: (id: string, isActive: boolean) => void;
  onRotateClick: (id: string) => void;
  onDeleteClick: (id: string) => void;
  rotating: boolean;
  deleting: boolean;
}

export function EndpointsTable({
  endpoints,
  isAdmin,
  onToggle,
  onRotateClick,
  onDeleteClick,
  rotating,
  deleting,
}: EndpointsTableProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card shadow-md">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-[40%]">
              Endpoint
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
              Events
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
              Last delivery
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
              Added
            </th>
            {isAdmin && (
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground text-right">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {endpoints.map((ep) => {
            const events: string[] = JSON.parse(ep.events) as string[];
            return (
              <tr
                key={ep.id}
                className={cn("hover:bg-muted/10 transition-colors", !ep.isActive && "opacity-60")}
              >
                {/* Endpoint name + URL */}
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <span
                      className={cn(
                        "mt-1.5 w-2 h-2 rounded-full shrink-0",
                        ep.isActive ? "bg-emerald-500" : "bg-muted-foreground/30",
                      )}
                    />
                    <div className="min-w-0">
                      {ep.name && (
                        <p className="font-medium text-foreground truncate text-xs">{ep.name}</p>
                      )}
                      <code className="text-xs font-mono text-muted-foreground break-all">
                        {ep.url}
                      </code>
                      {!ep.isActive && (
                        <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground bg-muted/20">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Events */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {events.includes("*") ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                        All events
                      </span>
                    ) : (
                      events.map((e) => <EventBadge key={e} event={e} />)
                    )}
                  </div>
                </td>

                {/* Last delivery */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <DeliveryCell
                    lastDeliveryAt={ep.lastDeliveryAt}
                    lastDeliveryStatus={ep.lastDeliveryStatus}
                  />
                </td>

                {/* Added date */}
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                  {formatDate(ep.createdAt)}
                </td>

                {/* Actions */}
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <EndpointActions
                        id={ep.id}
                        isActive={ep.isActive}
                        onToggle={onToggle}
                        onRotateClick={() => onRotateClick(ep.id)}
                        onDeleteClick={() => onDeleteClick(ep.id)}
                        rotating={rotating}
                        deleting={deleting}
                      />
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
