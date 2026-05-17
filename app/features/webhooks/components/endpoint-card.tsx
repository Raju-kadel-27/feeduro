import { useState } from "react";
import { cn } from "@lib/utils";
import { EndpointHeader } from "./endpoint-header";
import { EndpointActions } from "./endpoint-actions";
import { EndpointEvents } from "./endpoint-events";
import { ConfirmationBanner } from "./confirmation-banner";
import type { EndpointRow } from "../types";

interface EndpointCardProps {
  ep: EndpointRow;
  isAdmin: boolean;
  onToggle: (id: string, isActive: boolean) => void;
  onRotate: (id: string) => void;
  onDelete: (id: string) => void;
  rotating: boolean;
  deleting: boolean;
}

export function EndpointCard({
  ep,
  isAdmin,
  onToggle,
  onRotate,
  onDelete,
  rotating,
  deleting,
}: EndpointCardProps) {
  const events: string[] = JSON.parse(ep.events) as string[];
  // Per-card confirmation state: "rotate" | "delete" | null
  const [confirming, setConfirming] = useState<"rotate" | "delete" | null>(
    null,
  );

  return (
    <div className={cn("p-4 space-y-3", !ep.isActive && "opacity-60")}>
      {/* Top row: name + url + actions */}
      <div className="flex items-start justify-between gap-3">
        <EndpointHeader name={ep.name} url={ep.url} />

        {isAdmin && (
          <EndpointActions
            id={ep.id}
            isActive={ep.isActive}
            onToggle={onToggle}
            onRotateClick={() => setConfirming("rotate")}
            onDeleteClick={() => setConfirming("delete")}
            rotating={rotating}
            deleting={deleting}
          />
        )}
      </div>

      {/* Event badges + meta */}
      <EndpointEvents events={events} createdAt={ep.createdAt} />

      {/* Inline confirmation banners */}
      {confirming && (
        <ConfirmationBanner
          type={confirming}
          onConfirm={() => {
            if (confirming === "rotate") {
              onRotate(ep.id);
            } else {
              onDelete(ep.id);
            }
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
