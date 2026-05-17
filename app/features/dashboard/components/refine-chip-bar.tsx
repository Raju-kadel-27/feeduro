import { DatePickerWithRange } from "@components/ui/date-picker-with-range";
import { SegmentFilterChip } from "@features/segmentation/components/segment-filter-chip";
import type { Segment } from "@features/segmentation/types";
import { cn } from "@lib/utils";
import { ChevronDown, Filter } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Board, Refinements, Sort, Status, View, ViewFilters } from "../types";
import { BooleanChip, type ChipOption, RefineChip } from "./refine-chip";

const STATUS_OPTIONS: ChipOption[] = [
  { value: "open", label: "Pending", color: "#94a3b8" },
  { value: "reviewing", label: "Reviewing", color: "#f97316" },
  { value: "planned", label: "Planned", color: "#eab308" },
  { value: "in-progress", label: "In Progress", color: "#8b5cf6" },
  { value: "completed", label: "Completed", color: "#22c55e" },
  { value: "closed", label: "Closed", color: "#f87171" },
];

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "votes", label: "Most votes" },
  { value: "trending", label: "Trending" },
];

interface RefineChipBarProps {
  activeView: View | undefined;
  refinements: Refinements;
  effectiveSort: Sort;
  hasRefinements: boolean;
  boards: Board[];
  segments?: Segment[];
  onSetRefinement: (key: string, value: string | string[] | boolean | undefined) => void;
  onClearRefinements: () => void;
  onSaveChanges: () => void;
  onSaveAsNew: () => void;
  className?: string;
}

function SortMenu({ value, onChange }: { value: Sort; onChange: (s: Sort) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const label = SORT_OPTIONS.find((o) => o.value === value)?.label ?? "Sort";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1 text-[13.5px] text-[#71717a] hover:text-[#18181b] transition-colors"
      >
        Sort: <span className="font-medium text-[#18181b]">{label}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[180px] rounded-lg border border-[#ececec] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-[13.5px] text-left hover:bg-[#f4f4f5] transition-colors",
                value === opt.value && "font-medium text-[#18181b]",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RefineChipBar({
  activeView,
  refinements,
  effectiveSort,
  hasRefinements,
  boards,
  segments = [],
  onSetRefinement,
  onClearRefinements,
  onSaveChanges,
  onSaveAsNew,
  className,
}: RefineChipBarProps) {
  const viewFilters: ViewFilters = activeView?.filters ?? {};

  const boardOptions: ChipOption[] = boards.map((b) => ({ value: b.id, label: b.name }));

  return (
    <div className={cn("flex items-center gap-2 px-[18px] py-2 border-b flex-wrap", className)}>
      <span className="text-[13px] text-[#a1a1aa] font-medium shrink-0">Refine:</span>

      <RefineChip
        label="Board"
        options={boardOptions}
        selected={refinements.board ?? []}
        multiSelect
        hidden={!!viewFilters.board?.length}
        onSelect={(id) => {
          const cur = refinements.board ?? [];
          onSetRefinement("board", cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
        }}
        onClear={() => onSetRefinement("board", [])}
      />

      {viewFilters.minAge == null &&
        viewFilters.maxAge == null &&
        !viewFilters.dateFrom &&
        !viewFilters.dateTo && (
          <DatePickerWithRange
            value={{
              from: refinements.dateFrom ? new Date(refinements.dateFrom) : undefined,
              to: refinements.dateTo ? new Date(refinements.dateTo) : undefined,
            }}
            onChange={(range) => {
              onSetRefinement("date", undefined);
              onSetRefinement("dateFrom", range?.from?.toISOString());
              onSetRefinement("dateTo", range?.to?.toISOString());
            }}
            onClear={() => {
              onSetRefinement("date", undefined);
              onSetRefinement("dateFrom", undefined);
              onSetRefinement("dateTo", undefined);
            }}
            placeholder="Date"
            className={cn(
              "h-auto w-auto py-1 px-2 text-[13px] font-normal rounded-md",
              refinements.dateFrom || refinements.dateTo
                ? "bg-[#18181b] text-white border-[#18181b] hover:bg-[#27272a] hover:text-white"
                : "text-[#71717a] border-[#d4d4d8] hover:bg-[#f4f4f5] hover:text-[#18181b]",
            )}
          />
        )}

      <RefineChip
        label="Status"
        options={STATUS_OPTIONS}
        selected={refinements.status ?? []}
        multiSelect
        hidden={!!viewFilters.status?.length}
        onSelect={(s) => {
          const cur = refinements.status ?? [];
          onSetRefinement(
            "status",
            cur.includes(s as Status) ? cur.filter((x) => x !== s) : [...cur, s],
          );
        }}
        onClear={() => onSetRefinement("status", [])}
      />

      {/* Segment chip — only shown when org has segments defined */}
      <SegmentFilterChip
        segments={segments}
        activeSegmentId={refinements.segmentId}
        onSelect={(id) => onSetRefinement("segment", id)}
      />

      {refinements.hasCustomerComment && (
        <BooleanChip
          label="Customer commented"
          active
          onToggle={() => {}}
          onClear={() => onSetRefinement("cust", undefined)}
        />
      )}
      {refinements.hasComments && (
        <BooleanChip
          label="Has comments"
          active
          onToggle={() => {}}
          onClear={() => onSetRefinement("commented", undefined)}
        />
      )}

      <PlusFilterMenu
        hasCust={!!refinements.hasCustomerComment || !!viewFilters.hasCustomerComment}
        hasCommented={!!refinements.hasComments || !!viewFilters.hasComments}
        onAddFilter={(key) => onSetRefinement(key, true)}
      />

      <div className="flex-1" />

      {hasRefinements ? (
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClearRefinements}
            className="px-2.5 py-1 text-[13.5px] text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5] rounded-md transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onSaveChanges}
            className="px-2.5 py-1 text-[13.5px] rounded-md border border-[#d4d4d8] hover:bg-[#f4f4f5] transition-colors font-medium"
          >
            Save changes
          </button>
          <button
            type="button"
            onClick={onSaveAsNew}
            className="px-2.5 py-1 text-[13.5px] rounded-md bg-[#18181b] text-white hover:bg-[#27272a] transition-colors font-medium"
          >
            Save as new view
          </button>
        </div>
      ) : (
        <SortMenu value={effectiveSort} onChange={(s) => onSetRefinement("sort", s)} />
      )}
    </div>
  );
}

function PlusFilterMenu({
  hasCust,
  hasCommented,
  onAddFilter,
}: {
  hasCust: boolean;
  hasCommented: boolean;
  onAddFilter: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const allHidden = hasCust && hasCommented;

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  if (allHidden) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[13px] text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#18181b] transition-colors border border-dashed border-[#d4d4d8] hover:border-solid"
      >
        <Filter className="h-3 w-3" />
        Filter
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[200px] rounded-lg border border-[#ececec] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
          {!hasCust && (
            <button
              type="button"
              onClick={() => {
                onAddFilter("cust");
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-[13.5px] text-left hover:bg-[#f4f4f5] transition-colors"
            >
              Customer commented
            </button>
          )}
          {!hasCommented && (
            <button
              type="button"
              onClick={() => {
                onAddFilter("commented");
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-[13.5px] text-left hover:bg-[#f4f4f5] transition-colors"
            >
              Has any comments
            </button>
          )}
        </div>
      )}
    </div>
  );
}
