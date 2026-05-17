import { cn } from "@lib/utils";
import { X } from "lucide-react";
import { STATUS_CONFIG, STATUS_ORDER } from "../constants";
import type { Board, Status } from "../types";

interface FilterSidebarProps {
  boards: Board[];
  statuses: Status[];
  boardIds: string[];
  dateFrom: string | null;
  dateTo: string | null;
  statusCounts: Record<string, number>;
  boardCounts: Record<string, number>;
  hasActiveFilters: boolean;
  onToggleStatus: (s: Status) => void;
  onToggleBoard: (id: string) => void;
  onSetParam: (key: string, value: string | string[] | null) => void;
  onClearFilters: () => void;
}

export function FilterSidebar({
  boards,
  statuses,
  boardIds,
  dateFrom,
  dateTo,
  statusCounts,
  boardCounts,
  hasActiveFilters,
  onToggleStatus,
  onToggleBoard,
  onSetParam,
  onClearFilters,
}: FilterSidebarProps) {
  return (
    <aside className="w-52 shrink-0 border-r bg-background flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Filters
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Status */}
      <div className="px-3 py-3 border-b">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Status
        </p>
        <div className="space-y-1.5">
          {STATUS_ORDER.map((s) => {
            const cfg = STATUS_CONFIG[s];
            const checked = statuses.includes(s);
            const count = statusCounts[s] ?? 0;
            return (
              <label
                key={s}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleStatus(s)}
                  className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer shrink-0"
                />
                <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
                <span className="text-xs text-foreground flex-1 leading-none">{cfg.label}</span>
                <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                  {count}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Boards */}
      {boards.length > 0 && (
        <div className="px-3 py-3 border-b">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Boards
          </p>
          <div className="space-y-1.5">
            {boards.map((board) => {
              const checked = boardIds.includes(board.id);
              const count = boardCounts[board.id] ?? 0;
              return (
                <label key={board.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleBoard(board.id)}
                    className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer shrink-0"
                  />
                  <span className="text-xs text-foreground flex-1 leading-none truncate">
                    {board.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                    {count}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Date Range */}
      <div className="px-3 py-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Date Range
        </p>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">From</label>
            <input
              type="date"
              value={dateFrom ?? ""}
              onChange={(e) => onSetParam("dateFrom", e.target.value || null)}
              className="w-full px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">To</label>
            <input
              type="date"
              value={dateTo ?? ""}
              onChange={(e) => onSetParam("dateTo", e.target.value || null)}
              className="w-full px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
