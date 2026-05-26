import { CollisionPriority } from "@dnd-kit/abstract";
import { useDroppable } from "@dnd-kit/react";
import { cn } from "@lib/utils";
import { Inbox } from "lucide-react";
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
        <div
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold",
            column.pill,
          )}
        >
          <column.icon className="h-3 w-3" />
          {column.label}
        </div>
        <span className="text-[11px] font-medium tabular-nums text-muted-foreground">{count}</span>
      </div>

      <div
        ref={ref}
        className={cn(
          "flex-1 flex flex-col rounded-xl border overflow-hidden min-h-[200px]",
          "transition-colors duration-150",
          column.bg,
          isDropTarget && isDraggingActive
            ? "border-primary/25 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.1)]"
            : "border-border/50",
        )}
      >
        <div className={cn("h-1 w-full shrink-0", column.accent)} />

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
