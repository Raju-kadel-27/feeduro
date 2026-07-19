import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, DollarSign, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { PlanCatalogEntry } from "../types";

interface DraftState {
  name: string;
  monthlyPrice: string;
  annualMonthlyPrice: string;
}

const emptyDraft: DraftState = { name: "", monthlyPrice: "", annualMonthlyPrice: "" };

function draftToPayload(draft: DraftState) {
  const price = Number.parseInt(draft.monthlyPrice, 10);
  const annual = Number.parseInt(draft.annualMonthlyPrice, 10);
  return {
    name: draft.name.trim(),
    monthlyPrice: Number.isNaN(price) || price < 0 ? 0 : price,
    annualMonthlyPrice: Number.isNaN(annual) || annual < 0 ? undefined : annual,
  };
}

const inputCls =
  "px-2.5 py-1.5 text-[13px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const btnBase = "inline-flex items-center gap-1 px-2.5 py-1.5 text-[13px] rounded-md transition-colors";

function PlanEditor({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  draft: DraftState;
  onChange: (d: DraftState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="text"
        placeholder="Plan name (e.g. pro)"
        value={draft.name}
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        className={`${inputCls} flex-1 min-w-[140px]`}
      />
      <label className="flex items-center gap-1">
        <span className="text-muted-foreground text-[12px] shrink-0">$/mo</span>
        <input
          type="number"
          min={0}
          placeholder="0"
          value={draft.monthlyPrice}
          onChange={(e) => onChange({ ...draft, monthlyPrice: e.target.value })}
          className={`${inputCls} w-24`}
          aria-label="Monthly price"
        />
      </label>
      <label className="flex items-center gap-1">
        <span className="text-muted-foreground text-[12px] shrink-0">annual $/mo</span>
        <input
          type="number"
          min={0}
          placeholder="optional"
          value={draft.annualMonthlyPrice}
          onChange={(e) => onChange({ ...draft, annualMonthlyPrice: e.target.value })}
          className={`${inputCls} w-28`}
          aria-label="Annual price normalized to $/mo (e.g. $960/yr → 80)"
        />
      </label>
      <div className="flex gap-1.5 ml-auto">
        <button type="button" onClick={onCancel} className={`${btnBase} border border-border hover:bg-accent`}>
          <X className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={!draft.name.trim() || saving}
          onClick={onSave}
          className={`${btnBase} bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40`}
        >
          <Check className="h-3.5 w-3.5" /> Save
        </button>
      </div>
    </div>
  );
}

export function PlanCatalogManager({
  initialPlans,
  isAdmin,
  orgSlug,
}: {
  initialPlans: PlanCatalogEntry[];
  isAdmin: boolean;
  orgSlug: string;
}) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);

  const { data } = useQuery({
    queryKey: ["plans", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/plans");
      return res.json() as Promise<{ plans: PlanCatalogEntry[] }>;
    },
    initialData: { plans: initialPlans },
    staleTime: 30_000,
  });
  const plans = data?.plans ?? [];

  const { mutate, isPending } = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Request failed");
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans", orgSlug] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function startEdit(plan: PlanCatalogEntry) {
    setAdding(false);
    setEditingId(plan.id);
    setDraft({
      name: plan.name,
      monthlyPrice: String(plan.monthlyPrice),
      annualMonthlyPrice: plan.annualMonthlyPrice != null ? String(plan.annualMonthlyPrice) : "",
    });
  }

  function startAdd() {
    setEditingId(null);
    setDraft(emptyDraft);
    setAdding(true);
  }

  function handleSave() {
    const payload = draftToPayload(draft);
    if (!payload.name) return;
    if (editingId) {
      mutate({ intent: "update", id: editingId, ...payload });
      toast.success("Plan updated");
      setEditingId(null);
    } else {
      mutate({ intent: "create", ...payload });
      toast.success("Plan added");
      setAdding(false);
    }
    setDraft(emptyDraft);
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete plan "${name}"? Voters on this plan will fall back to $0 unless they have an explicit MRR.`))
      return;
    mutate({ intent: "delete", id });
    toast.success("Plan deleted");
  }

  return (
    <details id="plans-catalog" className="rounded-lg border border-border text-sm bg-muted/30 group" open={plans.length > 0}>
      <summary className="flex items-center justify-between p-4 cursor-pointer list-none font-medium text-foreground select-none">
        <span className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          Plans &amp; pricing
          {plans.length > 0 && (
            <span className="text-[11px] font-normal text-muted-foreground">
              {plans.length} {plans.length === 1 ? "plan" : "plans"}
            </span>
          )}
        </span>
        <svg
          className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <div className="px-4 pb-4 space-y-2.5">
        <p className="text-muted-foreground text-[13px]">
          One entry per plan tier. Set a monthly price and, optionally, an annual price (normalized
          to $/mo — e.g. $960/yr → 80). Users tagged with <code className="text-[11px]">billingInterval: annual</code> automatically use
          the annual price. An explicit per-user <code className="text-[11px]">mrr</code> always takes priority.
        </p>

        {plans.map((plan) =>
          editingId === plan.id ? (
            <div key={plan.id} className="rounded-md border border-primary/40 p-2.5 bg-background">
              <PlanEditor
                draft={draft}
                onChange={setDraft}
                onSave={handleSave}
                onCancel={() => setEditingId(null)}
                saving={isPending}
              />
            </div>
          ) : (
            <div key={plan.id} className="flex items-center gap-3 rounded-md border border-border p-2.5 bg-background">
              <span className="font-medium capitalize flex-1 min-w-0 truncate">{plan.name}</span>
              <span className="tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                ${plan.monthlyPrice}/mo
              </span>
              {plan.annualMonthlyPrice != null && (
                <span className="tabular-nums text-[12px] text-muted-foreground">
                  · ${plan.annualMonthlyPrice}/mo annual
                </span>
              )}
              {isAdmin && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label={`Edit plan ${plan.name}`}
                    onClick={() => startEdit(plan)}
                    className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete plan ${plan.name}`}
                    onClick={() => handleDelete(plan.id, plan.name)}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ),
        )}

        {isAdmin &&
          (adding ? (
            <div className="rounded-md border border-primary/40 p-2.5 bg-background">
              <PlanEditor
                draft={draft}
                onChange={setDraft}
                onSave={handleSave}
                onCancel={() => setAdding(false)}
                saving={isPending}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={startAdd}
              className="inline-flex items-center gap-1.5 text-[13px] text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add plan
            </button>
          ))}
      </div>
    </details>
  );
}
