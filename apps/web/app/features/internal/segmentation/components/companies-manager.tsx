import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, Pencil, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Company } from "../types";
import { CompanyMonogram } from "./company-monogram";

interface Draft {
  name: string;
  monthlySpend: string;
  plan: string;
}

const inputCls =
  "px-2.5 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const btnBase = "inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md transition-colors";

export function CompaniesManager({
  initialCompanies,
  isAdmin,
  orgSlug,
}: {
  initialCompanies: Company[];
  isAdmin: boolean;
  orgSlug: string;
}) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ name: "", monthlySpend: "", plan: "" });
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    queryKey: ["companies", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/companies");
      return res.json() as Promise<{ companies: Company[] }>;
    },
    initialData: { companies: initialCompanies },
    staleTime: 30_000,
  });
  const companies = data?.companies ?? [];

  const { mutate, isPending } = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Request failed");
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies", orgSlug] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => (c.name ?? c.externalId).toLowerCase().includes(q));
  }, [companies, search]);

  function startEdit(c: Company) {
    setEditingId(c.id);
    setDraft({
      name: c.name ?? "",
      monthlySpend: c.monthlySpend != null ? String(c.monthlySpend) : "",
      plan: c.plan ?? "",
    });
  }

  function handleSave(id: string) {
    const spend = Number.parseInt(draft.monthlySpend, 10);
    mutate({
      intent: "update",
      id,
      name: draft.name.trim() || undefined,
      monthlySpend: Number.isNaN(spend) || spend < 0 ? undefined : spend,
      plan: draft.plan.trim() || undefined,
    });
    toast.success("Company updated");
    setEditingId(null);
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Remove "${name}"? Its members lose their company link, but their profiles remain.`))
      return;
    mutate({ intent: "delete", id });
    toast.success("Company removed");
  }

  return (
    <details className="rounded-lg border border-border bg-muted/30 group" open={companies.length > 0}>
      <summary className="flex items-center justify-between p-4 cursor-pointer list-none text-base font-medium text-foreground select-none">
        <span className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          Companies
          {companies.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground tabular-nums">
              {companies.length}
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
        <p className="text-muted-foreground text-sm">
          Companies are created when you identify users with a company (widget or CSV). MRR impact
          counts each company once, no matter how many of its members vote. Edit spend or remove here.
        </p>

        {companies.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No companies yet.</p>
        ) : (
          <>
            {companies.length > 6 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search companies…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`${inputCls} w-full pl-8`}
                />
              </div>
            )}

            <ul className="space-y-1 max-h-80 overflow-y-auto">
              {filtered.map((c) =>
                editingId === c.id ? (
                  <li key={c.id} className="rounded-md border border-primary/40 p-2.5 bg-background">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="Company name"
                        value={draft.name}
                        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                        className={`${inputCls} flex-1 min-w-[130px]`}
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-sm">$</span>
                        <input
                          type="number"
                          min={0}
                          placeholder="MRR"
                          value={draft.monthlySpend}
                          onChange={(e) => setDraft((d) => ({ ...d, monthlySpend: e.target.value }))}
                          className={`${inputCls} w-24`}
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Plan"
                        value={draft.plan}
                        onChange={(e) => setDraft((d) => ({ ...d, plan: e.target.value }))}
                        className={`${inputCls} w-28`}
                      />
                      <div className="flex gap-1.5 ml-auto">
                        <button type="button" onClick={() => setEditingId(null)} className={`${btnBase} border border-border hover:bg-accent`}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleSave(c.id)}
                          className={`${btnBase} bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40`}
                        >
                          <Check className="h-3.5 w-3.5" /> Save
                        </button>
                      </div>
                    </div>
                  </li>
                ) : (
                  <li key={c.id} className="flex items-center gap-2.5 rounded-md border border-border p-2.5 bg-background">
                    <CompanyMonogram name={c.name} seed={c.id} size={26} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name ?? c.externalId}</p>
                      {c.plan && (
                        <span className="text-xs text-muted-foreground capitalize">{c.plan}</span>
                      )}
                    </div>
                    {c.monthlySpend != null ? (
                      <span className="tabular-nums text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        ${c.monthlySpend}
                        <span className="text-xs font-normal text-muted-foreground">/mo</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">from plan</span>
                    )}
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          aria-label={`Edit ${c.name ?? c.externalId}`}
                          onClick={() => startEdit(c)}
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${c.name ?? c.externalId}`}
                          onClick={() => handleDelete(c.id, c.name ?? c.externalId)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                ),
              )}
              {filtered.length === 0 && (
                <li className="text-sm text-muted-foreground italic px-1 py-2">
                  No companies match "{search}".
                </li>
              )}
            </ul>
          </>
        )}
      </div>
    </details>
  );
}
