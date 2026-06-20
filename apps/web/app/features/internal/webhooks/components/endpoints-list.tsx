import { Button } from "@components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@components/ui/empty";
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
        <Empty className="border border-border">
          <EmptyMedia variant="icon" className="bg-teal-500/10 text-teal-600 dark:text-teal-400"><Webhook /></EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No endpoints configured</EmptyTitle>
            <EmptyDescription>
              Connect your backend to receive real-time events when feedback is submitted or changelogs are published.
            </EmptyDescription>
          </EmptyHeader>
          {isAdmin && (
            <EmptyContent>
              <Button size="sm" onClick={onAddEndpoint}>
                <Plus size={16} />
                Add your first endpoint
              </Button>
            </EmptyContent>
          )}
        </Empty>
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
