import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover";
import { cn } from "@lib/utils";
import { Check, ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { StatusKey } from "../../schemas/public";

type Sort = "trending" | "top" | "new";

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "trending", label: "Trending" },
  { value: "top", label: "Top" },
  { value: "new", label: "New" },
];

const STATUS_FILTERS: { id: StatusKey; label: string }[] = [
  { id: "reviewing", label: "Under Review" },
  { id: "planned", label: "Planned" },
  { id: "inprogress", label: "In Progress" },
  { id: "completed", label: "Complete" },
];

const SCOPE_FILTERS = ["My Own", "My Teams"];

export function FilterRow({
  active,
  toggle,
  sort,
  setSort,
}: {
  active: Set<StatusKey>;
  toggle: (id: StatusKey) => void;
  sort: Sort;
  setSort: (s: Sort) => void;
}) {
  const [activeScope, setActiveScope] = useState<Set<string>>(new Set());

  function toggleScope(label: string) {
    setActiveScope((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  const activeCount = active.size + activeScope.size;
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Sort";

  return (
    <div className="flex items-center gap-2 pb-3 border-b border-border">
      <div className="relative w-52">
        <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search posts..."
          className="h-7 w-full rounded-md border border-border bg-background pl-7 pr-3 text-[14px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Sort chip */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-background text-[14px] font-medium text-foreground hover:bg-muted transition-colors"
            >
              Sort: {sortLabel}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={6} className="p-1 w-36">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setSort(o.value)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded text-[14.5px] transition-colors",
                  sort === o.value
                    ? "text-foreground font-medium bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {o.label}
                {sort === o.value && <Check className="h-3 w-3 shrink-0" />}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Filter chip */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 h-7 px-2.5 rounded-md border text-[14px] font-medium transition-colors",
                activeCount > 0
                  ? "border-foreground/40 bg-muted text-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted",
              )}
            >
              <SlidersHorizontal className="h-3 w-3" />
              Filter
              {activeCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background text-[12px] font-bold">
                  {activeCount}
                </span>
              )}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={6} className="p-1 w-40">
            <p className="px-2.5 pt-1 pb-0.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </p>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => toggle(f.id)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-[14px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <span
                  className={cn(
                    "h-3 w-3 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
                    active.has(f.id) ? "bg-foreground border-foreground" : "border-border",
                  )}
                >
                  {active.has(f.id) && <Check className="h-2 w-2 text-background" />}
                </span>
                <span className={cn(active.has(f.id) && "text-foreground font-")}>{f.label}</span>
              </button>
            ))}
            <div className="my-1 mx-2 h-px bg-border" />
            <p className="px-2 pt-1 pb-0.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              Scope
            </p>
            {SCOPE_FILTERS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleScope(label)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-[14.5px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <span
                  className={cn(
                    "h-3 w-3 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
                    activeScope.has(label) ? "bg-foreground border-foreground" : "border-border",
                  )}
                >
                  {activeScope.has(label) && <Check className="h-2 w-2 text-background" />}
                </span>
                <span className={cn(activeScope.has(label) && "text-foreground font-medium")}>{label}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
