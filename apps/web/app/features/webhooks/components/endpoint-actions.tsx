import { cn } from "@lib/utils";
import { RefreshCw, Trash2 } from "lucide-react";

interface EndpointActionsProps {
  id: string;
  isActive: boolean;
  onToggle: (id: string, isActive: boolean) => void;
  onRotateClick: () => void;
  onDeleteClick: () => void;
  rotating: boolean;
  deleting: boolean;
}

export function EndpointActions({
  id,
  isActive,
  onToggle,
  onRotateClick,
  onDeleteClick,
  rotating,
  deleting,
}: EndpointActionsProps) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {/* Active toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        onClick={() => onToggle(id, !isActive)}
        title={isActive ? "Disable" : "Enable"}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none",
          isActive ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform",
            isActive ? "translate-x-4" : "translate-x-0",
          )}
        />
      </button>

      {/* Rotate secret */}
      <button
        type="button"
        onClick={onRotateClick}
        disabled={rotating}
        title="Rotate signing secret"
        className="p-2 rounded-md hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        <RefreshCw size={15} />
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={onDeleteClick}
        disabled={deleting}
        title="Delete endpoint"
        className="p-2 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground disabled:opacity-50"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
