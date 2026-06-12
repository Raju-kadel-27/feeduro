import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog";
import { Plus, Webhook } from "lucide-react";
import { useState } from "react";
import type { EndpointRow } from "../types";
import { EndpointCard } from "./endpoint-card";
import { EndpointsTable } from "./endpoints-table";

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

type Confirming = { id: string; type: "rotate" | "delete" } | null;

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
  const [confirming, setConfirming] = useState<Confirming>(null);

  function handleConfirm() {
    if (!confirming) return;
    if (confirming.type === "rotate") onRotate(confirming.id);
    else onDelete(confirming.id);
    setConfirming(null);
  }

  const isRotate = confirming?.type === "rotate";

  return (
    <section>
      <h3 className="text-base font-bold text-foreground mb-4">Endpoints</h3>

      {endpoints.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center bg-muted/10">
          <Webhook size={24} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No webhook endpoints yet.</p>
        </div>
      ) : (
        <>
          {/* Table layout on medium+ screens */}
          <div className="hidden md:block">
            <EndpointsTable
              endpoints={endpoints}
              isAdmin={isAdmin}
              onToggle={onToggle}
              onRotateClick={(id) => setConfirming({ id, type: "rotate" })}
              onDeleteClick={(id) => setConfirming({ id, type: "delete" })}
              rotating={rotating}
              deleting={deleting}
            />
          </div>

          {/* Card layout on small screens */}
          <div className="md:hidden rounded-lg border border-border overflow-hidden bg-card shadow-md divide-y divide-border">
            {endpoints.map((ep) => (
              <EndpointCard
                key={ep.id}
                ep={ep}
                isAdmin={isAdmin}
                onToggle={onToggle}
                onRotateClick={(id) => setConfirming({ id, type: "rotate" })}
                onDeleteClick={(id) => setConfirming({ id, type: "delete" })}
                rotating={rotating}
                deleting={deleting}
              />
            ))}
          </div>
        </>
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

      {/* Confirmation modal */}
      <Dialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={isRotate ? "text-amber-600" : "text-destructive"}>
              {isRotate ? "Rotate signing secret?" : "Delete this endpoint?"}
            </DialogTitle>
            <DialogDescription>
              {isRotate
                ? "Your current secret will stop working immediately. Update your consumer before continuing."
                : "All deliveries will stop immediately and the endpoint cannot be recovered."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="px-4 py-2 rounded-md border border-border bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={rotating || deleting}
              className={
                isRotate
                  ? "px-4 py-2 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
                  : "px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
              }
            >
              {isRotate ? "Yes, rotate" : "Yes, delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
