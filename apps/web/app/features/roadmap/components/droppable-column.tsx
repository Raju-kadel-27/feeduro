import { CollisionPriority } from "@dnd-kit/abstract";
import { useDroppable } from "@dnd-kit/react";
import { cn } from "@lib/utils";
import { Inbox, MoreHorizontal, Plus } from "lucide-react";
import type { COLUMNS } from "../constants";

export function DroppableColumn({
  column,
  children,
  count,
  isDraggingActive,
  onAdd,
  onMenu,
}: {
  column: (typeof COLUMNS)[number];
  children: React.ReactNode;
  count: number;
  isDraggingActive: boolean;
  onAdd?: () => void;
  onMenu?: () => void;
}) {
  const { ref, isDropTarget } = useDroppable({
    id: column.id,
    type: "column",
    accept: ["item"],
    collisionPriority: CollisionPriority.Low,
  });

  return (
    <div className="flex flex-col w-[300px] shrink-0">
      <div className="group flex items-center gap-2 mb-3 px-1">
        <div
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold",
            column.pill,
          )}
        >
          <column.icon className="h-3.5 w-3.5" />
          {column.label}
        </div>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">{count}</span>
        <div className="ml-auto flex items-center gap-0.5 transition-opacity">
          <button
            type="button"
            onClick={onMenu}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={ref}
        className={cn(
          "flex-1 flex flex-col rounded-xl overflow-hidden min-h-[200px]",
          "transition-colors duration-150",
          isDropTarget && isDraggingActive && "ring-1 ring-primary/20",
        )}
      >

        <div
          className={cn(
            "flex-1 flex flex-col gap-2 p-2 overflow-y-auto",
            "[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border",
          )}
        >
          {count === 0 && !isDraggingActive && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 min-h-[120px]">
              <Inbox className="h-5 w-5 text-muted-foreground/20" />
              <p className="text-[11px] text-muted-foreground/35 select-none">No items</p>
            </div>
          )}

          {count > 0 && children}

          {isDraggingActive && isDropTarget && (
            <div className="h-0.5 rounded-full bg-primary/40 mx-1 mt-1 shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}
