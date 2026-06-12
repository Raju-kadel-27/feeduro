import { Badge } from "@components/ui/badge";
import type { EndpointRow } from "../types";
import { EndpointActions } from "./endpoint-actions";
import { EndpointEvents } from "./endpoint-events";
import { EndpointHeader } from "./endpoint-header";
import { SecretRevealRow } from "./secret-reveal-row";

interface EndpointCardProps {
  ep: EndpointRow;
  isAdmin: boolean;
  onToggle: (id: string, isActive: boolean) => void;
  onRotateClick: (id: string) => void;
  onDeleteClick: (id: string) => void;
  rotating: boolean;
  deleting: boolean;
}

export function EndpointCard({
  ep,
  isAdmin,
  onToggle,
  onRotateClick,
  onDeleteClick,
  rotating,
  deleting,
}: EndpointCardProps) {
  const events: string[] = JSON.parse(ep.events) as string[];

  return (
    <div className="p-4 space-y-3">
      {/* Top row: name + url + inactive badge + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-2">
          <EndpointHeader
            name={ep.name}
            url={ep.url}
            lastDeliveryAt={ep.lastDeliveryAt}
            lastDeliveryStatus={ep.lastDeliveryStatus}
          />
          {!ep.isActive && (
            <Badge variant="outline" className="shrink-0 text-muted-foreground mt-0.5">
              Inactive
            </Badge>
          )}
        </div>

        {isAdmin && (
          <EndpointActions
            id={ep.id}
            isActive={ep.isActive}
            onToggle={onToggle}
            onRotateClick={() => onRotateClick(ep.id)}
            onDeleteClick={() => onDeleteClick(ep.id)}
            rotating={rotating}
            deleting={deleting}
          />
        )}
      </div>

      {/* Event badges + created date */}
      <EndpointEvents events={events} createdAt={ep.createdAt} />

      {/* Secret reveal (admin only) */}
      {isAdmin && <SecretRevealRow endpointId={ep.id} />}
    </div>
  );
}
