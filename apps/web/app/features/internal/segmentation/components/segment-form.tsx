import { cn } from "@lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronUp, Loader2, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Segment, SegmentFilters } from "../types";

const COLOR_OPTIONS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#64748b",
];

export interface SegmentFormState {
  name: string;
  color: string;
  plan: string[];
  billingInterval: "monthly" | "annual" | "";
  role: string;
  industry: string;
  location: string;
  minCompanySize: string;
  maxCompanySize: string;
  minMrr: string;
  maxMrr: string;
}

export const defaultForm = (): SegmentFormState => ({
  name: "",
  color: "#6366f1",
  plan: [],
  billingInterval: "",
  role: "",
  industry: "",
  location: "",
  minCompanySize: "",
  maxCompanySize: "",
  minMrr: "",
  maxMrr: "",
});

export function formFromSegment(seg: Segment): SegmentFormState {
  return {
    name: seg.name,
    color: seg.color,
    plan: seg.filters.plan ?? [],
    billingInterval: (seg.filters.billingInterval?.[0] ?? "") as "monthly" | "annual" | "",
    role: seg.filters.role?.[0] ?? "",
    industry: seg.filters.industry?.[0] ?? "",
    location: seg.filters.location?.[0] ?? "",
    minCompanySize: seg.filters.minCompanySize?.toString() ?? "",
    maxCompanySize: seg.filters.maxCompanySize?.toString() ?? "",
    minMrr: seg.filters.minMrr?.toString() ?? "",
    maxMrr: seg.filters.maxMrr?.toString() ?? "",
  };
}

export function filtersFromForm(form: SegmentFormState): SegmentFilters {
  const filters: SegmentFilters = {};
  if (form.plan.length) filters.plan = form.plan;
  if (form.billingInterval) filters.billingInterval = [form.billingInterval];
  if (form.role.trim()) filters.role = [form.role.trim()];
  if (form.industry.trim()) filters.industry = [form.industry.trim()];
  if (form.location.trim()) filters.location = [form.location.trim()];
  const min = Number.parseInt(form.minCompanySize, 10);
  const max = Number.parseInt(form.maxCompanySize, 10);
  if (!Number.isNaN(min) && min > 0) filters.minCompanySize = min;
  if (!Number.isNaN(max) && max > 0) filters.maxCompanySize = max;
  const minMrr = Number.parseInt(form.minMrr, 10);
  const maxMrr = Number.parseInt(form.maxMrr, 10);
  if (!Number.isNaN(minMrr) && minMrr >= 0) filters.minMrr = minMrr;
  if (!Number.isNaN(maxMrr) && maxMrr >= 0) filters.maxMrr = maxMrr;
  return filters;
}

export function SegmentForm({
  initial,
  onSave,
  onCancel,
  onChange,
  planOptions = [],
}: {
  initial: SegmentFormState;
  onSave: (form: SegmentFormState) => void;
  onCancel: () => void;
  onChange?: (state: SegmentFormState) => void;
  /** Plan names from the org's plan catalog. */
  planOptions?: string[];
}) {
  const [form, setForm] = useState<SegmentFormState>(initial);

  // Single setter that also notifies the parent so they can persist a draft.
  function update(patch: Partial<SegmentFormState> | ((prev: SegmentFormState) => SegmentFormState)) {
    setForm((prev) => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      onChange?.(next);
      return next;
    });
  }

  // Catalog plans plus any already-selected plans not (or no longer) in the catalog,
  // so editing an existing segment never silently drops a filter value.
  const planChoices = useMemo(
    () => Array.from(new Set([...planOptions, ...form.plan])),
    [planOptions, form.plan],
  );
  const [showAdvanced, setShowAdvanced] = useState(
    () =>
      !!(
        initial.billingInterval ||
        initial.role ||
        initial.industry ||
        initial.location ||
        initial.minCompanySize ||
        initial.maxCompanySize ||
        initial.minMrr ||
        initial.maxMrr
      ),
  );

  const [debouncedFilters, setDebouncedFilters] = useState<SegmentFilters>(() => filtersFromForm(initial));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedFilters(filtersFromForm(form)), 400);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [form]);

  const hasFilters = Object.keys(debouncedFilters).length > 0;

  const { data: countData, isFetching: countFetching } = useQuery({
    queryKey: ["segments", "preview", debouncedFilters],
    queryFn: async () => {
      const res = await fetch(`/api/segments?filters=${encodeURIComponent(JSON.stringify(debouncedFilters))}`);
      return res.json() as Promise<{ count: number }>;
    },
    enabled: hasFilters,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5 flex-wrap" role="radiogroup" aria-label="Segment color">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              aria-pressed={form.color === c}
              onClick={() => update({ color: c })}
              className={cn(
                "h-5 w-5 rounded-full transition-transform",
                form.color === c && "ring-2 ring-offset-1 ring-ring scale-110",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <input
          type="text"
          placeholder="Segment name (e.g. Paying customers)"
          value={form.name}
          onChange={(e) => update({ name: e.target.value })}
          className="flex-1 px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div>
        <p className="text-xs text-muted-foreground font-medium mb-1.5">Customer plan</p>
        {planChoices.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">
            Define plans in <span className="font-medium">Plans &amp; pricing</span> above to filter
            by plan.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {planChoices.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={form.plan.includes(p)}
                onClick={() => update((f) => ({ ...f, plan: f.plan.includes(p) ? f.plan.filter((x) => x !== p) : [...f.plan, p] }))}
                className={cn(
                  "px-2.5 py-1 text-[12.5px] rounded-md border capitalize transition-colors",
                  form.plan.includes(p)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {showAdvanced ? "Hide advanced filters" : "More filters (billing, role, industry, location, size, MRR)"}
      </button>

      {showAdvanced && (
        <div className="space-y-3 animate-in slide-in-from-top-1 fade-in duration-150">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1.5">Billing interval</p>
            <div className="flex gap-1.5">
              {(["", "monthly", "annual"] as const).map((v) => (
                <button
                  key={v || "all"}
                  type="button"
                  onClick={() => update({ billingInterval: v })}
                  className={cn(
                    "px-2.5 py-1 text-[12.5px] rounded-md border capitalize transition-colors",
                    form.billingInterval === v
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  )}
                >
                  {v || "All"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(["role", "industry", "location"] as const).map((field) => (
              <label key={field} className="block">
                <span className="text-xs text-muted-foreground font-medium capitalize block mb-1">
                  {field}
                </span>
                <input
                  type="text"
                  placeholder={`e.g. ${field === "role" ? "founder" : field === "industry" ? "SaaS" : "North America"}`}
                  value={form[field]}
                  onChange={(e) => update({ [field]: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-[13px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </label>
            ))}
          </div>

          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1.5">Company size (employees)</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                placeholder="Min"
                value={form.minCompanySize}
                onChange={(e) => update({ minCompanySize: e.target.value })}
                className="w-full px-2.5 py-1.5 text-[13px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground shrink-0">to</span>
              <input
                type="number"
                min={1}
                placeholder="Max"
                value={form.maxCompanySize}
                onChange={(e) => update({ maxCompanySize: e.target.value })}
                className="w-full px-2.5 py-1.5 text-[13px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1.5">MRR ($/month)</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="Min"
                value={form.minMrr}
                onChange={(e) => update({ minMrr: e.target.value })}
                className="w-full px-2.5 py-1.5 text-[13px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground shrink-0">to</span>
              <input
                type="number"
                min={0}
                placeholder="Max"
                value={form.maxMrr}
                onChange={(e) => update({ maxMrr: e.target.value })}
                className="w-full px-2.5 py-1.5 text-[13px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground h-5">
          {hasFilters && (
            countFetching ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Calculating…</>
            ) : countData != null ? (
              <><Users className="h-3 w-3" /> {countData.count.toLocaleString()} {countData.count === 1 ? "user" : "users"} match</>
            ) : null
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] rounded-md border border-border hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
          <button
            type="button"
            disabled={!form.name.trim()}
            onClick={() => onSave(form)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" /> Save segment
          </button>
        </div>
      </div>
    </div>
  );
}
