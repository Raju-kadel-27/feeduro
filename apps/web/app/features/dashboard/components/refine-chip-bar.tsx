import type { Category, Tag } from "@features/dashboard/types";
import type { Segment } from "@features/segmentation/types";
import { cn } from "@lib/utils";
import { Search } from "lucide-react";
import { PageTitle } from "@/app/components/common/page-title";
import type {
  Board,
  Refinements,
  Sort,
  Status,
  View,
  ViewFilters,
} from "../types";
import { ChipOptionRow } from "./chip-option-row";
import { ChipPopover } from "./chip-popover";
import { ChipTrigger } from "./chip-trigger";
import { DateRangeChip } from "./date-range-chip";
import { type ChipOption, RefineChip } from "./refine-chip";
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


function SortMenu({
  value,
  hasOverride,
  onChange,
}: {
  value: Sort;
  hasOverride: boolean;
  onChange: (s: Sort | undefined) => void;
}) {
  const sortLabel = SORT_OPTIONS.find((o) => o.value === value)?.label ?? "Sort";
  const showLabel = value !== "newest";

  return (
    <ChipTrigger
      label="Sort"
      isActive={hasOverride}
      activeLabel={showLabel ? sortLabel : undefined}
      onClear={() => onChange(undefined)}
    >
      {(close) => (
        <ChipPopover className="min-w-[180px]">
          {SORT_OPTIONS.map((opt) => (
            <ChipOptionRow
              key={opt.value}
              label={opt.label}
              isSelected={value === opt.value}
              onClick={() => { onChange(opt.value); close(); }}
            />
          ))}
        </ChipPopover>
      )}
    </ChipTrigger>
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
          hasOverride={!!refinements.sort}
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

        {hasRefinements && (
          <button
            type="button"
            onClick={onClearRefinements}
            className="px-2.5 py-1 text-[15px] text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors shrink-0"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
