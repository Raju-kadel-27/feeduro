import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@components/ui/alert-dialog";
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

function PlanEditor({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
  large,
}: {
  draft: DraftState;
  onChange: (d: DraftState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  large?: boolean;
}) {
  const smInputCls = "px-2.5 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
  const smBtnBase = "inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md transition-colors";

  if (large) {
    const lgInputCls = "w-full pl-7 pr-3 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Plan name
          </label>
          <input
            type="text"
            placeholder="e.g. starter, pro, enterprise"
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Monthly price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">$</span>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={draft.monthlyPrice}
                onChange={(e) => onChange({ ...draft, monthlyPrice: e.target.value })}
                className={lgInputCls}
                aria-label="Monthly price in dollars per month"
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Charged each month</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Annual price{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">$</span>
              <input
                type="number"
                min={0}
                placeholder="leave blank if none"
                value={draft.annualMonthlyPrice}
                onChange={(e) => onChange({ ...draft, annualMonthlyPrice: e.target.value })}
                className={lgInputCls}
                aria-label="Annual plan price, entered as the per-month equivalent"
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Enter the <strong className="text-foreground font-medium">monthly equivalent</strong> — e.g. $960/yr → <strong className="text-foreground font-medium">80</strong>
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" /> Cancel
          </button>
          <button
            type="button"
            disabled={!draft.name.trim() || saving}
            onClick={onSave}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            <Check className="h-4 w-4" /> Save plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="text"
        placeholder="Plan name (e.g. pro)"
        value={draft.name}
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        className={`${smInputCls} flex-1 min-w-[140px]`}
      />
      <label className="flex items-center gap-1.5">
        <span className="text-muted-foreground text-xs shrink-0">$/mo</span>
        <input
          type="number"
          min={0}
          placeholder="0"
          value={draft.monthlyPrice}
          onChange={(e) => onChange({ ...draft, monthlyPrice: e.target.value })}
          className={`${smInputCls} w-24`}
          aria-label="Monthly price"
        />
      </label>
      <label className="flex items-center gap-1.5">
        <span className="text-muted-foreground text-xs shrink-0">annual $/mo equiv.</span>
        <input
          type="number"
          min={0}
          placeholder="optional"
          value={draft.annualMonthlyPrice}
          onChange={(e) => onChange({ ...draft, annualMonthlyPrice: e.target.value })}
          className={`${smInputCls} w-28`}
          aria-label="Annual price as monthly equivalent (e.g. $960/yr → 80)"
        />
      </label>
      <div className="flex gap-1.5 ml-auto">
        <button type="button" onClick={onCancel} className={`${smBtnBase} border border-border hover:bg-accent`}>
          <X className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={!draft.name.trim() || saving}
          onClick={onSave}
          className={`${smBtnBase} bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40`}
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
  large,
}: {
  initialPlans: PlanCatalogEntry[];
  isAdmin: boolean;
  orgSlug: string;
  large?: boolean;
}) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [deletingPlan, setDeletingPlan] = useState<PlanCatalogEntry | null>(null);

  const { data } = useQuery({
    queryKey: ["plans", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/plans");
      return res.json() as Promise<{ plans: PlanCatalogEntry[] }>;
    },
    placeholderData: { plans: initialPlans },
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

  function confirmDelete() {
    if (!deletingPlan) return;
    mutate({ intent: "delete", id: deletingPlan.id });
    toast.success("Plan deleted");
    setDeletingPlan(null);
  }

  const planList = (
    <div className={`space-y-${large ? "3" : "2.5"}`}>
      {!large && (
        <p className="text-sm text-muted-foreground">
          One entry per plan tier. Set a monthly price and, optionally, an annual price (normalized
          to $/mo — e.g. $960/yr → 80). Users tagged with{" "}
          <code className="text-xs">billingInterval: annual</code>{" "}
          automatically use the annual price. An explicit per-user{" "}
          <code className="text-xs">mrr</code>{" "}
          always takes priority.
        </p>
      )}

      {plans.map((plan) =>
        editingId === plan.id ? (
          <div key={plan.id} className={`rounded-${large ? "lg" : "md"} border border-primary/40 ${large ? "p-4" : "p-2.5"} bg-background`}>
            <PlanEditor
              draft={draft}
              onChange={setDraft}
              onSave={handleSave}
              onCancel={() => setEditingId(null)}
              saving={isPending}
              large={large}
            />
          </div>
        ) : (
          <div key={plan.id} className={`flex items-center gap-3 rounded-${large ? "lg" : "md"} border border-border ${large ? "p-4" : "p-2.5"} bg-background`}>
            <span className={`font-semibold capitalize flex-1 min-w-0 truncate ${large ? "text-base" : ""}`}>{plan.name}</span>
            <span className={`tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold ${large ? "text-base" : ""}`}>
              ${plan.monthlyPrice}/mo
            </span>
            {plan.annualMonthlyPrice != null && (
              <span className={`tabular-nums text-muted-foreground ${large ? "text-sm" : "text-xs"}`}>
                · ${plan.annualMonthlyPrice}/mo annual
              </span>
            )}
            {isAdmin && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  aria-label={`Edit plan ${plan.name}`}
                  onClick={() => startEdit(plan)}
                  className={`${large ? "p-2" : "p-1.5"} rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors`}
                >
                  <Pencil className={large ? "h-4 w-4" : "h-3.5 w-3.5"} />
                </button>
                <button
                  type="button"
                  aria-label={`Delete plan ${plan.name}`}
                  onClick={() => setDeletingPlan(plan)}
                  className={`${large ? "p-2" : "p-1.5"} rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors`}
                >
                  <Trash2 className={large ? "h-4 w-4" : "h-3.5 w-3.5"} />
                </button>
              </div>
            )}
          </div>
        ),
      )}

      {isAdmin &&
        (adding ? (
          <div className={`rounded-${large ? "lg" : "md"} border border-primary/40 ${large ? "p-4" : "p-2.5"} bg-background`}>
            <PlanEditor
              draft={draft}
              onChange={setDraft}
              onSave={handleSave}
              onCancel={() => setAdding(false)}
              saving={isPending}
              large={large}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={startAdd}
            className={`inline-flex items-center gap-1.5 text-sm text-primary hover:underline`}
          >
            <Plus className={large ? "h-4 w-4" : "h-3.5 w-3.5"} /> Add plan
          </button>
        ))}
    </div>
  );

  const deleteDialog = (
    <AlertDialog open={!!deletingPlan} onOpenChange={(o) => { if (!o) setDeletingPlan(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete plan "{deletingPlan?.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Customers on this plan will fall back to $0 MRR unless they have an explicit mrr value.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (large) {
    return (
      <>
        <div id="plans-catalog">{planList}</div>
        {deleteDialog}
      </>
    );
  }

  return (
    <>
      <details id="plans-catalog" className="rounded-lg border border-border bg-muted/30 group" open={plans.length > 0}>
        <summary className="flex items-center justify-between p-4 cursor-pointer list-none text-base font-medium text-foreground select-none">
          <span className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Plans &amp; pricing
            {plans.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
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
        <div className="px-4 pb-4">
          {planList}
        </div>
      </details>
      {deleteDialog}
    </>
  );
}
