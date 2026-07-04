import type { SegmentFilters } from "@features/internal/segmentation/types";

const CHIP_CLASS: Record<string, string> = {
  plan: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
  role: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
  industry: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  location: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  size: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  mrr: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
};

export function FilterChips({ filters }: { filters: SegmentFilters }) {
  const chips: { key: string; label: string }[] = [];

  for (const p of filters.plan ?? []) chips.push({ key: "plan", label: p });
  for (const r of filters.role ?? []) chips.push({ key: "role", label: r });
  for (const i of filters.industry ?? []) chips.push({ key: "industry", label: i });
  for (const l of filters.location ?? []) chips.push({ key: "location", label: l });

  if (filters.minCompanySize != null && filters.maxCompanySize != null) {
    chips.push({ key: "size", label: `${filters.minCompanySize}–${filters.maxCompanySize} employees` });
  } else if (filters.minCompanySize != null) {
    chips.push({ key: "size", label: `≥${filters.minCompanySize} employees` });
  } else if (filters.maxCompanySize != null) {
    chips.push({ key: "size", label: `≤${filters.maxCompanySize} employees` });
  }

  if (filters.minMrr != null && filters.maxMrr != null) {
    chips.push({ key: "mrr", label: `$${filters.minMrr}–$${filters.maxMrr}/mo` });
  } else if (filters.minMrr != null) {
    chips.push({ key: "mrr", label: `≥$${filters.minMrr}/mo` });
  } else if (filters.maxMrr != null) {
    chips.push({ key: "mrr", label: `≤$${filters.maxMrr}/mo` });
  }

  if (chips.length === 0) {
    return <span className="text-[12px] text-muted-foreground">No filters</span>;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {chips.map(({ key, label }) => (
        <span
          key={`${key}-${label}`}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border ${CHIP_CLASS[key]}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
