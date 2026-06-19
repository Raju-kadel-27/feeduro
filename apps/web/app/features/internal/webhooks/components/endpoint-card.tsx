import { cn } from "@lib/utils";
import { ChevronRight } from "lucide-react";
import type { EndpointRow } from "../types";
import { EndpointHeader } from "./endpoint-header";

interface EndpointCardProps {
  ep: EndpointRow;
  onSelect: (endpoint: EndpointRow) => void;
}

export function EndpointCard({ ep, onSelect }: EndpointCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(ep)}
      className={cn(
        "w-full text-left p-4 flex items-center gap-3 hover:bg-muted/10 transition-colors",
        !ep.isActive && "opacity-60",
      )}
    >
      <span
        className={cn(
          "w-2 h-2 rounded-full shrink-0 mt-1",
          ep.isActive ? "bg-emerald-500" : "bg-muted-foreground/30",
        )}
      />
      <div className="flex-1 min-w-0">
        <EndpointHeader
          name={ep.name}
          url={ep.url}
          lastDeliveryAt={ep.lastDeliveryAt}
          lastDeliveryStatus={ep.lastDeliveryStatus}
        />
      </div>
      <ChevronRight size={15} className="text-muted-foreground/40 shrink-0" />
    </button>
  );
}
