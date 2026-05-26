import type { Category, Tag } from "@features/dashboard/types";
import type { Segment } from "@features/segmentation/types";
import { DateRangeChip } from "./date-range-chip";
import { cn } from "@lib/utils";
import { ChevronDown, Search, X } from "lucide-react";
import { useRef, useState } from "react";
import { PageTitle } from "@/app/components/common/page-title";
import type {
  Board,
  Refinements,
  Sort,
  Status,
  View,
  ViewFilters,
} from "../types";
import { BooleanChip, type ChipOption, RefineChip } from "./refine-chip";
import { ViewsChip } from "./views-chip";

interface OrgAdmin {
  id: string;
  name: string | null;
  image: string | null;
}

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
  views: View[];
  activeViewId: string | null;
  activeView: View | undefined;
  viewCounts: Record<string, number>;
  refinements: Refinements;
  effectiveSort: Sort;
  hasRefinements: boolean;
  boards: Board[];
  tags?: Tag[];
  categories?: Category[];
  segments?: Segment[];
  orgAdmins?: OrgAdmin[];
  onSwitchView: (viewId: string) => void;
  onClearView: () => void;
  onSetRefinement: (
    key: string,
    value: string | string[] | boolean | undefined,
  ) => void;
  onClearRefinements: () => void;
  onNewRequest: () => void;
  onSearchOpen: () => void;
  className?: string;
}

const DEFAULT_SORT: Sort = "newest";

function SortMenu({
  value,
  onChange,
}: {
  value: Sort;
  onChange: (s: Sort) => void;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActive = value !== DEFAULT_SORT;
  const label = SORT_OPTIONS.find((o) => o.value === value)?.label ?? "Sort";

  function openMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  return (
    <div
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <div
        className={cn(
          "inline-flex items-center rounded-md text-[13.5px] transition-colors",
          isActive
            ? "border border-border bg-accent font-medium text-foreground"
            : "border border-dashed border-border text-muted-foreground hover:bg-accent hover:border-solid hover:text-foreground",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1"
        >
          {isActive ? (
            <>
              <span className="text-muted-foreground font-normal">Sort:</span>
              <span className="font-semibold">{label}</span>
            </>
          ) : (
            <>
              <span>Sort</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </>
          )}
        </button>
        {isActive && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(DEFAULT_SORT);
            }}
            className="pr-2 ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Reset sort"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[180px] rounded-lg border border-border bg-popover shadow-lg dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-[13.5px] text-left hover:bg-accent transition-colors",
                value === opt.value && "font-medium text-foreground",
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
  views,
  activeViewId,
  activeView,
  viewCounts,
  refinements,
  effectiveSort,
  hasRefinements,
  boards,
  tags = [],
  categories = [],
  segments = [],
  orgAdmins = [],
  onSwitchView,
  onClearView,
  onSetRefinement,
  onClearRefinements,
  onNewRequest,
  onSearchOpen,
  className,
}: RefineChipBarProps) {
  const viewFilters: ViewFilters = activeView?.filters ?? {};
  const boardOptions: ChipOption[] = boards.map((b) => ({
    value: b.id,
    label: b.name,
  }));
  const ownerOptions: ChipOption[] = [
    { value: "unassigned", label: "Unassigned" },
    ...orgAdmins.map((m) => ({ value: m.id, label: m.name ?? m.id })),
  ];

  return (
    <div className={cn("flex flex-col", className)}>
      <PageTitle
        title="Feedbacks"
        className="border-b-0 px-[18px] h-auto pt-2 pb-0"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSearchOpen}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              aria-label="Search feedback"
            >
              <Search className="h-4 w-4" />
              <kbd className="hidden sm:inline text-[11px] font-mono bg-muted px-1 py-0.5 rounded">⌘K</kbd>
            </button>
            <button
              type="button"
              onClick={onNewRequest}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer"
            >
              <span className="text-base leading-none">+</span>
              New feedback
            </button>
          </div>
        }
      />

      <div className="flex items-center gap-2 px-[18px] py-2 flex-wrap">
        <ViewsChip
          views={views}
          activeViewId={activeViewId}
          activeView={activeView}
          viewCounts={viewCounts}
          onSwitchView={onSwitchView}
          onClearView={onClearView}
        />
        <SortMenu
          value={effectiveSort}
          onChange={(s) => onSetRefinement("sort", s)}
        />
        <RefineChip
          label="Board"
          options={boardOptions}
          selected={refinements.board ?? []}
          multiSelect
          hidden={!!viewFilters.board?.length}
          onSelect={(id) => {
            const cur = refinements.board ?? [];
            onSetRefinement(
              "board",
              cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
            );
          }}
          onClear={() => onSetRefinement("board", [])}
        />

        <DateRangeChip
          datePreset={refinements.datePreset}
          dateFrom={refinements.dateFrom}
          dateTo={refinements.dateTo}
          hidden={
            viewFilters.minAge != null ||
            viewFilters.maxAge != null ||
            !!viewFilters.dateFrom ||
            !!viewFilters.dateTo
          }
          onSetRefinement={onSetRefinement}
        />

        <RefineChip
          label="Tags"
          options={tags.map((t) => ({ value: t.id, label: t.name, color: t.color }))}
          selected={refinements.tagIds ?? []}
          multiSelect
          hidden={tags.length === 0}
          onSelect={(id) => {
            const cur = refinements.tagIds ?? [];
            onSetRefinement("tag", cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
          }}
          onClear={() => onSetRefinement("tag", [])}
        />

        <RefineChip
          label="Category"
          options={categories.map((c) => ({ value: c.id, label: c.name, color: c.color }))}
          selected={refinements.categoryId ?? []}
          multiSelect
          hidden={categories.length === 0}
          onSelect={(id) => {
            const cur = refinements.categoryId ?? [];
            onSetRefinement(
              "category",
              cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
            );
          }}
          onClear={() => onSetRefinement("category", [])}
        />

        <RefineChip
          label="Owner"
          options={ownerOptions}
          selected={refinements.owner ?? []}
          multiSelect
          hidden={ownerOptions.length <= 1}
          onSelect={(id) => {
            const cur = refinements.owner ?? [];
            onSetRefinement(
              "owner",
              cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
            );
          }}
          onClear={() => onSetRefinement("owner", [])}
        />

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
              cur.includes(s as Status)
                ? cur.filter((x) => x !== s)
                : [...cur, s],
            );
          }}
          onClear={() => onSetRefinement("status", [])}
        />

        <RefineChip
          label="Segment"
          options={segments.map((s) => ({
            value: s.id,
            label: s.name,
            color: s.color,
          }))}
          singleSelected={refinements.segmentId}
          selected={[]}
          multiSelect={false}
          hidden={segments.length === 0}
          onSelect={(id) =>
            onSetRefinement(
              "segment",
              refinements.segmentId === id ? undefined : id,
            )
          }
          onClear={() => onSetRefinement("segment", undefined)}
        />

        <BooleanChip
          label="Customer commented"
          active={!!refinements.hasCustomerComment}
          onToggle={() => onSetRefinement("cust", true)}
          onClear={() => onSetRefinement("cust", undefined)}
        />
        <BooleanChip
          label="Has comments"
          active={!!refinements.hasComments}
          onToggle={() => onSetRefinement("commented", true)}
          onClear={() => onSetRefinement("commented", undefined)}
        />

        {hasRefinements && (
          <button
            type="button"
            onClick={onClearRefinements}
            className="px-2.5 py-1 text-[13.5px] text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors shrink-0"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
