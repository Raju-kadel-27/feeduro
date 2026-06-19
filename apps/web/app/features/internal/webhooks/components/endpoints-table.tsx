import { cn } from "@lib/utils";
import { ChevronRight } from "lucide-react";
import type { EndpointRow } from "../types";

function DeliveryStatus({
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
  onSelect: (endpoint: EndpointRow) => void;
}

export function EndpointsTable({ endpoints, onSelect }: EndpointsTableProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
              Endpoint
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-28">
              Status
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-36">
              Last delivery
            </th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {endpoints.map((ep) => (
            <tr
              key={ep.id}
              onClick={() => onSelect(ep)}
              className={cn(
                "hover:bg-muted/10 transition-colors cursor-pointer",
                !ep.isActive && "opacity-60",
              )}
            >
              <td className="px-4 py-3">
                <p className="text-xs font-medium text-foreground truncate">
                  {ep.name ?? new URL(ep.url).hostname}
                </p>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                    ep.isActive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      ep.isActive ? "bg-emerald-500" : "bg-muted-foreground/40",
                    )}
                  />
                  {ep.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <DeliveryStatus
                  lastDeliveryAt={ep.lastDeliveryAt}
                  lastDeliveryStatus={ep.lastDeliveryStatus}
                />
              </td>
              <td className="pr-3 py-3">
                <ChevronRight size={15} className="text-muted-foreground/40" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
