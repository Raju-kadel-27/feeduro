import { cn } from "@lib/utils";
import { Search } from "lucide-react";
import { STATUS } from "../constants";
import type { StatusKey } from "../schemas/public";
import { StatusFilterChip } from "./status-filter-chip";

export function FilterRow({
  active,
  toggle,
  sort,
  setSort,
}: {
  active: Set<StatusKey>;
  toggle: (id: StatusKey) => void;
  sort: "top" | "new";
  setSort: (s: "top" | "new") => void;
}) {
  const statuses = Object.keys(STATUS) as StatusKey[];
  return (
    <div className="flex flex-wrap items-center gap-2.5 pb-4 border-b border-slate-100">
      <div className="relative w-60">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Search posts..."
          className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-[12.5px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div className="h-5 w-px bg-slate-200" />

      <div className="inline-flex rounded-lg bg-slate-100 p-1 gap-0.5">
        <button
          onClick={() => setSort("top")}
          className={cn(
            "px-3 py-1 text-[12.5px] font-medium rounded-md transition-colors",
            sort === "top"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900",
          )}
        >
          Top
        </button>
        <button
          onClick={() => setSort("new")}
          className={cn(
            "px-3 py-1 text-[12.5px] font-medium rounded-md transition-colors",
            sort === "new"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900",
          )}
        >
          New
        </button>
      </div>

      <div className="h-5 w-px bg-slate-200" />

      {statuses.map((id) => (
        <StatusFilterChip key={id} id={id} active={active.has(id)} onClick={() => toggle(id)} />
      ))}
    </div>
  );
}
