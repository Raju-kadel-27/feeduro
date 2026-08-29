import { cn } from "@lib/utils";
import { Plus, Search } from "lucide-react";
import type { View } from "../types";

interface ViewHeaderProps {
  activeView: View | undefined;
  hasRefinements: boolean;
  postCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNewRequest: () => void;
  className?: string;
}

export function ViewHeader({
  activeView,
  hasRefinements,
  postCount,
  searchQuery,
  onSearchChange,
  onNewRequest,
  className,
}: ViewHeaderProps) {
  return (
    <div className={cn("border-b shrink-0", className)}>
      <div className="flex items-center gap-3 px-[18px] py-3.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {activeView && <span className="text-xl leading-none shrink-0">{activeView.emoji}</span>}
          <h1 className="text-[17px] font-semibold tracking-tight truncate">
            {activeView?.name ?? "Requests"}
          </h1>
          <span className="text-sm text-muted-foreground shrink-0">
            {postCount} post{postCount !== 1 ? "s" : ""}
          </span>
          {hasRefinements && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Modified
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 w-64 rounded-lg border bg-background px-2.5 focus-within:ring-2 focus-within:ring-ring">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search this view…"
              className="flex-1 py-1.5 text-sm bg-transparent focus:outline-none min-w-0"
            />
          </div>
          <button
            type="button"
            onClick={onNewRequest}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Request
          </button>
        </div>
      </div>
    </div>
  );
}
