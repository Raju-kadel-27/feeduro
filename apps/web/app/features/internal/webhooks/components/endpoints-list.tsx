import { Button } from "@components/ui/button";
import { Plus, Webhook } from "lucide-react";
import { useNavigate } from "react-router";
import type { EndpointRow } from "../types";
import { EndpointCard } from "./endpoint-card";
import { EndpointsTable } from "./endpoints-table";

interface EndpointsListProps {
  endpoints: EndpointRow[];
  isAdmin: boolean;
  onAddEndpoint: () => void;
}

export function EndpointsList({ endpoints, isAdmin, onAddEndpoint }: EndpointsListProps) {
  const navigate = useNavigate();

  function handleSelect(ep: EndpointRow) {
    navigate(ep.id, { relative: "path" });
  }

  return (
    <section>
      <h3 className="text-base font-bold text-foreground mb-4">Endpoints</h3>

      {endpoints.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center bg-muted/10 space-y-3">
          <Webhook size={40} className="mx-auto text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-foreground">No endpoints configured</p>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your backend to receive real-time events when feedback is submitted or
              changelogs are published.
            </p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={onAddEndpoint}>
              <Plus size={16} />
              Add your first endpoint
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <EndpointsTable endpoints={endpoints} onSelect={handleSelect} />
          </div>
          <div className="md:hidden rounded-lg border border-border overflow-hidden bg-card shadow-sm divide-y divide-border">
            {endpoints.map((ep) => (
              <EndpointCard key={ep.id} ep={ep} onSelect={handleSelect} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
