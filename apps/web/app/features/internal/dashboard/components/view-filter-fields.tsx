import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Switch } from "@components/ui/switch";
import type { Board, Category, Sort, Status, Tag } from "@features/internal/dashboard/types";
import type { Segment } from "@features/internal/segmentation/types";
import { cn } from "@lib/utils";

const STATUS_OPTIONS = [
  { value: "open", label: "Pending" },
  { value: "reviewing", label: "Reviewing" },
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "votes", label: "Most votes" },
  { value: "trending", label: "Trending" },
] as const;

export interface FilterState {
  sort: Sort;
  status: Status[];
  board: string[];
  tagIds: string[];
  categoryId: string[];
  segmentId: string | undefined;
  hasCustomerComment: boolean;
  hasComments: boolean;
}

export const EMPTY_FILTER_STATE: FilterState = {
  sort: "newest",
  status: [],
  board: [],
  tagIds: [],
  categoryId: [],
  segmentId: undefined,
  hasCustomerComment: false,
  hasComments: false,
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function Chips({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  if (!options.length) return null;
  return (
    <div className="space-y-1.5">
      <SectionLabel>{label}</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              aria-pressed={active}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[12.5px] transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:bg-accent hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RadioChips({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string | undefined;
  onSelect: (v: string | undefined) => void;
}) {
  if (!options.length) return null;
  return (
    <div className="space-y-1.5" role="radiogroup" aria-label={label}>
      <SectionLabel>{label}</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(active ? undefined : o.value)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[12.5px] transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:bg-accent hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  state: FilterState;
  onChange: <K extends keyof FilterState>(key: K, val: FilterState[K]) => void;
  boards: Board[];
  tags: Tag[];
  categories: Category[];
  segments: Segment[];
}

export function ViewFilterFields({ state, onChange, boards, tags, categories, segments }: Props) {
  function toggleMulti<K extends "status" | "board" | "tagIds" | "categoryId">(key: K, val: string) {
    const cur = state[key] as string[];
    onChange(key, (cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val]) as FilterState[K]);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <SectionLabel>Sort</SectionLabel>
        <Select value={state.sort} onValueChange={(v) => onChange("sort", v as Sort)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Chips
        label="Status"
        options={STATUS_OPTIONS}
        selected={state.status}
        onToggle={(v) => toggleMulti("status", v)}
      />

      {boards.length > 1 && (
        <Chips
          label="Board"
          options={boards.map((b) => ({ value: b.id, label: b.name }))}
          selected={state.board}
          onToggle={(v) => toggleMulti("board", v)}
        />
      )}

      <Chips
        label="Tags"
        options={tags.map((t) => ({ value: t.id, label: t.name }))}
        selected={state.tagIds}
        onToggle={(v) => toggleMulti("tagIds", v)}
      />

      <Chips
        label="Category"
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        selected={state.categoryId}
        onToggle={(v) => toggleMulti("categoryId", v)}
      />

      <RadioChips
        label="Segment"
        options={segments.map((s) => ({ value: s.id, label: s.name }))}
        selected={state.segmentId}
        onSelect={(v) => onChange("segmentId", v)}
      />

      <div className="space-y-3 border-t border-border pt-4">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span className="text-sm">Customer commented</span>
          <Switch
            checked={state.hasCustomerComment}
            onCheckedChange={(v) => onChange("hasCustomerComment", v)}
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span className="text-sm">Has comments</span>
          <Switch
            checked={state.hasComments}
            onCheckedChange={(v) => onChange("hasComments", v)}
          />
        </label>
      </div>
    </div>
  );
}
