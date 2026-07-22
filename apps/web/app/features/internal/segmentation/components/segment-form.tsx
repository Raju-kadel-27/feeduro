import { cn } from "@lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronUp, Loader2, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SegmentTraitOptions } from "../server/queries";
import type { Segment, SegmentFilters } from "../types";
import { TraitCombobox } from "./trait-combobox";

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
  if (form.plan.length) filters.plan = form.plan.map((p) => p.toLowerCase());
  if (form.billingInterval) filters.billingInterval = [form.billingInterval];
  if (form.role.trim()) filters.role = [form.role.trim().toLowerCase()];
  if (form.industry.trim()) filters.industry = [form.industry.trim().toLowerCase()];
  if (form.location.trim()) filters.location = [form.location.trim().toLowerCase()];
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
  orgSlug,
}: {
  initial: SegmentFormState;
  onSave: (form: SegmentFormState) => void;
  onCancel: () => void;
  onChange?: (state: SegmentFormState) => void;
  planOptions?: string[];
  orgSlug?: string;
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

  const { data: traitOptions } = useQuery({
    queryKey: ["segment-options", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/segment-options");
      return res.json() as Promise<SegmentTraitOptions>;
    },
    staleTime: 60_000,
  });
  const roleOptions = traitOptions?.roles ?? [];
  const industryOptions = traitOptions?.industries ?? [];
  const locationOptions = traitOptions?.locations ?? [];

  const inputCls = "w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Segment color">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              aria-pressed={form.color === c}
              onClick={() => update({ color: c })}
              className={cn(
                "h-6 w-6 rounded-full transition-transform",
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
          className="flex-1 px-3 py-2.5 text-base rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Customer plan</p>
        {planChoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Define plans in <span className="font-medium">Plans &amp; pricing</span> above to filter
            by plan.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {planChoices.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={form.plan.includes(p)}
                onClick={() => update((f) => ({ ...f, plan: f.plan.includes(p) ? f.plan.filter((x) => x !== p) : [...f.plan, p] }))}
                className={cn(
                  "px-4 py-2 text-sm rounded-lg border capitalize transition-colors",
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
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {showAdvanced ? "Hide advanced filters" : "More filters (billing, role, industry, location, size, MRR)"}
      </button>

      {showAdvanced && (
        <div className="space-y-4 animate-in slide-in-from-top-1 fade-in duration-150">
          <div>
            <p className="text-sm font-medium mb-2">Billing interval</p>
            <div className="flex gap-2">
              {(["", "monthly", "annual"] as const).map((v) => (
                <button
                  key={v || "all"}
                  type="button"
                  onClick={() => update({ billingInterval: v })}
                  className={cn(
                    "px-4 py-2 text-sm rounded-lg border capitalize transition-colors",
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

          <div className="grid grid-cols-3 gap-4">
            {(
              [
                { field: "role",     opts: roleOptions,     placeholder: "e.g. founder" },
                { field: "industry", opts: industryOptions, placeholder: "e.g. SaaS" },
                { field: "location", opts: locationOptions, placeholder: "e.g. North America" },
              ] as { field: "role" | "industry" | "location"; opts: string[]; placeholder: string }[]
            ).map(({ field, opts, placeholder }) => (
              <label key={field} className="block">
                <span className="text-sm font-medium capitalize block mb-1.5">{field}</span>
                <TraitCombobox
                  value={form[field]}
                  onChange={(v) => update({ [field]: v.toLowerCase() })}
                  options={opts}
                  placeholder={placeholder}
                  className={inputCls}
                />
              </label>
            ))}
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Company size (employees)</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                placeholder="Min"
                value={form.minCompanySize}
                onChange={(e) => update({ minCompanySize: e.target.value })}
                className={inputCls}
              />
              <span className="text-sm text-muted-foreground shrink-0">to</span>
              <input
                type="number"
                min={1}
                placeholder="Max"
                value={form.maxCompanySize}
                onChange={(e) => update({ maxCompanySize: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">MRR ($/month)</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                placeholder="Min"
                value={form.minMrr}
                onChange={(e) => update({ minMrr: e.target.value })}
                className={inputCls}
              />
              <span className="text-sm text-muted-foreground shrink-0">to</span>
              <input
                type="number"
                min={0}
                placeholder="Max"
                value={form.maxMrr}
                onChange={(e) => update({ maxMrr: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {hasFilters && (
            countFetching ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Calculating…</>
            ) : countData != null ? (
              <><Users className="h-4 w-4" /> {countData.count.toLocaleString()} {countData.count === 1 ? "user" : "users"} match</>
            ) : null
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" /> Cancel
          </button>
          <button
            type="button"
            disabled={!form.name.trim()}
            onClick={() => onSave(form)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            <Check className="h-4 w-4" /> Save segment
          </button>
        </div>
      </div>
    </div>
  );
}
