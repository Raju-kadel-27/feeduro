import type { Board, Category, Sort, Status, Tag } from "@features/internal/dashboard/types";
import type { Segment } from "@features/internal/segmentation/types";

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
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              className={`px-2.5 py-1 rounded-md text-[12.5px] border transition-colors ${
                active
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sort</p>
        <select
          value={state.sort}
          onChange={(e) => onChange("sort", e.target.value as Sort)}
          className="h-9 px-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <Chips label="Status" options={STATUS_OPTIONS} selected={state.status} onToggle={(v) => toggleMulti("status", v)} />
      {boards.length > 1 && (
        <Chips label="Board" options={boards.map((b) => ({ value: b.id, label: b.name }))} selected={state.board} onToggle={(v) => toggleMulti("board", v)} />
      )}
      <Chips label="Tags" options={tags.map((t) => ({ value: t.id, label: t.name }))} selected={state.tagIds} onToggle={(v) => toggleMulti("tagIds", v)} />
      <Chips label="Category" options={categories.map((c) => ({ value: c.id, label: c.name }))} selected={state.categoryId} onToggle={(v) => toggleMulti("categoryId", v)} />
      <Chips
        label="Segment"
        options={segments.map((s) => ({ value: s.id, label: s.name }))}
        selected={state.segmentId ? [state.segmentId] : []}
        onToggle={(v) => onChange("segmentId", state.segmentId === v ? undefined : v)}
      />
      <div className="flex gap-5 pt-1">
        {(
          [
            { key: "hasCustomerComment", label: "Customer commented" },
            { key: "hasComments", label: "Has comments" },
          ] as const
        ).map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={state[key]}
              onChange={(e) => onChange(key, e.target.checked)}
              className="rounded border-border accent-foreground"
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
