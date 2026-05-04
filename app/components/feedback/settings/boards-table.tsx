import { cn } from "@lib/utils";
import { GripVertical, MoreVertical } from "lucide-react";
import type { FeedbackBoard } from "./types";

interface BoardsTableProps {
  boards: FeedbackBoard[];
  onChangeVisibility: (id: string, visibility: "public" | "private") => void;
}

const dotColor: Record<FeedbackBoard["color"], string> = {
  green: "bg-emerald-500",
  red: "bg-red-500",
  blue: "bg-sky-500",
  amber: "bg-amber-500",
};

export function BoardsTable({ boards, onChangeVisibility }: BoardsTableProps) {
  if (boards.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No boards yet. Create one below.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <div className="grid grid-cols-[1fr_auto] items-center px-4 h-10 bg-muted/30 border-b border-border">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Board</div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide pr-9">Visibility</div>
      </div>

      <ul>
        {boards.map((b, i) => (
          <li
            key={b.id}
            className={cn(
              "grid grid-cols-[1fr_auto] items-center px-4 py-3 hover:bg-muted/20 transition-colors",
              i !== 0 && "border-t border-border",
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <GripVertical size={15} className="text-muted-foreground/40 cursor-grab shrink-0" />
              <span className={cn("h-2 w-2 rounded-full shrink-0", dotColor[b.color])} />
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">{b.name}</span>
                {b.isDefault && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                    default
                  </span>
                )}
              </div>
              {b.postCount > 0 && (
                <span className="ml-1 text-xs text-muted-foreground tabular-nums">
                  {b.postCount} {b.postCount === 1 ? "post" : "posts"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <select
                value={b.visibility}
                onChange={(e) => onChangeVisibility(b.id, e.target.value as "public" | "private")}
                className={cn(
                  "appearance-none bg-card text-foreground border border-border",
                  "rounded-md pl-3 pr-7 py-1.5 text-sm font-medium leading-none",
                  "focus:outline-none focus:border-muted-foreground",
                  "bg-no-repeat bg-[right_7px_center]",
                )}
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23a3a3a3' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 4 18 9'/><polyline points='6 15 12 20 18 15'/></svg>\")",
                }}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
              <button
                type="button"
                aria-label="More options"
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <MoreVertical size={15} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
