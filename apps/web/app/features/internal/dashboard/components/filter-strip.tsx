import { cn } from "@lib/utils";
import { LayoutGrid, List } from "lucide-react";
import type { Group, Sort, ViewMode } from "../types";

export function FilterStrip({
  sort,
  setSort,
  group,
  setGroup,
  view,
  setView,
  count,
}: {
  sort: Sort;
  setSort: (s: Sort) => void;
  group: Group;
  setGroup: (g: Group) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10 shrink-0">
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
        <span className="font-mono">{count}</span> results
      </span>

      <div className="flex-1" />

      <select
        value={sort}
        onChange={(e) => setSort(e.target.value as Sort)}
        className="px-2 py-1 rounded-md border text-xs text-muted-foreground bg-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary hover:border-primary/50 transition-colors"
      >
        <option value="trending">Sort: Trending</option>
        <option value="newest">Sort: Newest</option>
        <option value="oldest">Sort: Oldest</option>
        <option value="votes">Sort: Most votes</option>
        <option value="revenue">Sort: Revenue impact</option>
      </select>

      <select
        value={group}
        onChange={(e) => setGroup(e.target.value as Group)}
        className="px-2 py-1 rounded-md border text-xs text-muted-foreground bg-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary hover:border-primary/50 transition-colors"
      >
        <option value="none">Group: None</option>
        <option value="status">Group: Status</option>
        <option value="board">Group: Board</option>
      </select>

      <div className="h-5 w-px bg-border mx-0.5" />

      <div className="flex items-center rounded-md border overflow-hidden text-xs">
        <button
          onClick={() => setView("list")}
          className={cn(
            "flex items-center gap-1 px-2 py-1 transition-colors",
            view === "list"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <List className="h-3.5 w-3.5" />
          <span>List</span>
        </button>
        <button
          onClick={() => setView("board")}
          className={cn(
            "flex items-center gap-1 px-2 py-1 border-l transition-colors",
            view === "board"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span>Board</span>
        </button>
      </div>
    </div>
  );
}
