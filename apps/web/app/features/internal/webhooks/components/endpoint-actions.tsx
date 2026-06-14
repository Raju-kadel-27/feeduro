import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip";
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
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 shrink-0">
        {/* Status dot */}
        <span
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            isActive ? "bg-emerald-500" : "bg-muted-foreground/30",
          )}
          aria-hidden
        />

        {/* Active toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              aria-label={isActive ? "Disable webhook" : "Enable webhook"}
              onClick={() => onToggle(id, !isActive)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
          </TooltipTrigger>
          <TooltipContent>{isActive ? "Disable" : "Enable"}</TooltipContent>
        </Tooltip>

        {/* Rotate secret */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onRotateClick}
              disabled={rotating}
              className="p-2 rounded-md hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Rotate signing secret</TooltipContent>
        </Tooltip>

        {/* Delete */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onDeleteClick}
              disabled={deleting}
              className="p-2 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground disabled:opacity-50"
            >
              <Trash2 size={15} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Delete endpoint</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
