import { Plus, Webhook } from "lucide-react";
import { EndpointCard } from "./endpoint-card";
import type { EndpointRow } from "../types";

interface EndpointsListProps {
  endpoints: EndpointRow[];
  isAdmin: boolean;
  onToggle: (id: string, isActive: boolean) => void;
  onRotate: (id: string) => void;
  onDelete: (id: string) => void;
  onAddEndpoint: () => void;
  rotating: boolean;
  deleting: boolean;
}

export function EndpointsList({
  endpoints,
  isAdmin,
  onToggle,
  onRotate,
  onDelete,
  onAddEndpoint,
  rotating,
  deleting,
}: EndpointsListProps) {
  return (
    <section>
      <h3 className="text-base font-bold text-foreground mb-4">Endpoints</h3>

      {endpoints.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center bg-muted/10">
          <Webhook size={24} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No webhook endpoints yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden bg-card shadow-md divide-y divide-border">
          {endpoints.map((ep) => (
            <EndpointCard
              key={ep.id}
              ep={ep}
              isAdmin={isAdmin}
              onToggle={onToggle}
              onRotate={onRotate}
              onDelete={onDelete}
              rotating={rotating}
              deleting={deleting}
            />
          ))}
        </div>
      )}

      {isAdmin && (
        <button
          type="button"
          onClick={onAddEndpoint}
          className="inline-flex items-center gap-2 mt-4 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors shadow-sm"
        >
          <Plus size={16} />
          <span>Add Endpoint</span>
        </button>
      )}
    </section>
  );
}