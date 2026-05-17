import { SidebarTrigger } from "@components/ui/sidebar";
import { cn } from "@lib/utils";
import { Plus, Search } from "lucide-react";
import type { Board, View, ViewFilters } from "../types";

interface DefinedByChipProps {
  label: string;
  value: string;
}

function DefinedByChip({ label, value }: DefinedByChipProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11.5px] bg-[#f4f4f5] text-[#71717a]">
      <span className="font-normal">{label}:</span>
      <span className="font-semibold text-[#18181b]">{value}</span>
    </span>
  );
}

function buildDefinedByChips(filters: ViewFilters, boardMap: Record<string, Board>) {
  const chips: { label: string; value: string }[] = [];

  if (filters.status?.length) {
    const labels: Record<string, string> = {
      open: "Pending", reviewing: "Reviewing", planned: "Planned",
      "in-progress": "In Progress", completed: "Completed", closed: "Closed",
    };
    chips.push({ label: "Status", value: filters.status.map((s) => labels[s] ?? s).join(", ") });
  }
  if (filters.excludeStatus?.length) {
    const labels: Record<string, string> = {
      open: "Pending", reviewing: "Reviewing", planned: "Planned",
      "in-progress": "In Progress", completed: "Completed", closed: "Closed",
    };
    chips.push({ label: "Not", value: filters.excludeStatus.map((s) => labels[s] ?? s).join(", ") });
  }
  if (filters.board?.length) {
    chips.push({ label: "Board", value: filters.board.map((id) => boardMap[id]?.name ?? id).join(", ") });
  }
  if (filters.minAge != null) chips.push({ label: "Older than", value: `${filters.minAge}d` });
  if (filters.maxAge != null) chips.push({ label: "Within", value: `${filters.maxAge}d` });
  if (filters.hasCustomerComment) chips.push({ label: "Customer", value: "commented" });
  if (filters.hasComments) chips.push({ label: "Has", value: "comments" });

  return chips;
}

interface ViewHeaderProps {
  activeView: View | undefined;
  hasRefinements: boolean;
  boardMap: Record<string, Board>;
  postCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNewRequest: () => void;
  className?: string;
}

export function ViewHeader({
  activeView,
  hasRefinements,
  boardMap,
  postCount,
  searchQuery,
  onSearchChange,
  onNewRequest,
  className,
}: ViewHeaderProps) {
  const definedByChips = activeView
    ? buildDefinedByChips(activeView.filters, boardMap)
    : [];

  return (
    <div className={cn("border-b shrink-0", className)}>
      {/* Top row */}
      <div className="flex items-center gap-3 px-[18px] py-3.5">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {activeView && (
            <span className="text-xl leading-none shrink-0">{activeView.emoji}</span>
          )}
          <h1 className="text-[17px] font-semibold tracking-tight truncate">
            {activeView?.name ?? "Requests"}
          </h1>
          <span className="text-sm text-[#71717a] shrink-0">
            {postCount} post{postCount !== 1 ? "s" : ""}
          </span>
          {hasRefinements && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-[#fef3c7] text-[#b45309]">
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-[#18181b] text-white hover:bg-[#27272a] transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Request
          </button>
        </div>
      </div>

      {/* "Defined by" chips row */}
      {definedByChips.length > 0 && (
        <div className="flex items-center gap-1.5 px-[18px] pb-2.5 flex-wrap">
          <span className="text-[11px] text-[#a1a1aa] font-medium shrink-0">Defined by</span>
          {definedByChips.map((chip) => (
            <DefinedByChip key={chip.label} label={chip.label} value={chip.value} />
          ))}
        </div>
      )}
    </div>
  );
}
