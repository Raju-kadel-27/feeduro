import { CollisionPriority } from "@dnd-kit/abstract";
import { useDroppable } from "@dnd-kit/react";
import { cn } from "@lib/utils";
import { Plus } from "lucide-react";
import type { COLUMNS } from "../constants";

export function DroppableColumn({
  column,
  children,
  count,
  isDraggingActive,
}: {
  column: (typeof COLUMNS)[number];
  children: React.ReactNode;
  count: number;
  isDraggingActive: boolean;
}) {
  const { ref, isDropTarget } = useDroppable({
    id: column.id,
    type: "column",
    accept: ["item"],
    collisionPriority: CollisionPriority.Low,
  });

  return (
    <div className="flex flex-col w-[300px] shrink-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold", column.pill)}>
          <column.icon className="h-3 w-3" />
          {column.label}
        </div>
        <span className="text-[11px] font-medium tabular-nums text-muted-foreground">{count}</span>
        <button
          type="button"
          className="ml-auto p-1 rounded text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/60 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        ref={ref}
        className={cn(
          "flex-1 flex flex-col gap-2 rounded-lg p-1.5 min-h-[200px] overflow-y-auto transition-colors duration-150",
          "[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent",
          "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border",
          isDropTarget && isDraggingActive ? "bg-muted/30" : "bg-transparent",
        )}
      >
        {count === 0 && !isDraggingActive && (
          <div className="flex flex-1 items-center justify-center min-h-[80px]">
            <p className="text-[10px] text-muted-foreground/30 select-none">No items</p>
          </div>
        )}
        {count > 0 && children}
        {isDraggingActive && isDropTarget && (
          <div className="flex items-center justify-center rounded-md border-2 border-dashed border-primary/40 py-3 mt-0.5">
            <p className="text-[11px] font-medium text-primary/50 select-none">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}
