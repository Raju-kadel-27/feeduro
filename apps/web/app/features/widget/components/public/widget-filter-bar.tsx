import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover";
import { cn } from "@lib/utils";
import { Check, ChevronDown, Search } from "lucide-react";
import type { StatusKey } from "../../constants";
import { STATUS } from "../../constants";

export type WidgetSort = "new" | "top";

const STATUS_FILTERS = (Object.keys(STATUS) as StatusKey[]).filter((k) => k !== "pending" && k !== "closed");

interface WidgetFilterBarProps {
  search: string;
  onSearch: (v: string) => void;
  sort: WidgetSort;
  onSort: (s: WidgetSort) => void;
  active: Set<StatusKey>;
  onToggle: (id: StatusKey) => void;
}

export function WidgetFilterBar({
  search,
  onSearch,
  sort,
  onSort,
  active,
  onToggle,
}: WidgetFilterBarProps) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/60">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search…"
          className="h-7 w-full rounded-md border border-border bg-background pl-6 pr-2 text-[12px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-background text-[11.5px] font-medium text-foreground hover:bg-muted transition-colors shrink-0"
          >
            {sort === "new" ? "New" : "Top"}
            <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={5} className="p-1 w-28">
          {(["new", "top"] as WidgetSort[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSort(s)}
              className={cn(
                "w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[12px] capitalize transition-colors",
                sort === s ? "font-medium text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {s} {sort === s && <Check className="h-3 w-3 shrink-0" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 h-7 px-2 rounded-md border text-[11.5px] font-medium transition-colors shrink-0",
              active.size > 0
                ? "border-foreground/40 bg-muted text-foreground"
                : "border-border bg-background text-foreground hover:bg-muted",
            )}
          >
            Filter
            {active.size > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-bold">
                {active.size}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={5} className="p-1 w-36">
          {STATUS_FILTERS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onToggle(id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <span
                className={cn(
                  "h-3 w-3 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
                  active.has(id) ? "bg-foreground border-foreground" : "border-border",
                )}
              >
                {active.has(id) && <Check className="h-2 w-2 text-background" />}
              </span>
              {STATUS[id].label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
