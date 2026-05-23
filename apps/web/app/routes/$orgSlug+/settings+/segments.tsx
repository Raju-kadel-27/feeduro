import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { AppSidebar } from "@features/layout/components/app-sidebar/app-sidebar";
import { getOrgSegments } from "@features/segmentation/server/service";
import type { Segment, SegmentFilters } from "@features/segmentation/types";
import { cn } from "@lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useParams, useRevalidator } from "react-router";
import { toast } from "sonner";
import { getDb } from "@/db";
import { member } from "@/db/schema";
import type { Route } from "./+types/segments";

export function meta() {
  return [{ title: "Segments — Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const [memberRecord, segmentList] = await Promise.all([
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      columns: { role: true },
    }),
    getOrgSegments(organizationId),
  ]);

  return {
    isAdmin: memberRecord?.role === "admin",
    segments: segmentList,
  };
}

const PLAN_OPTIONS = ["free", "trial", "paying", "churned"];
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

interface SegmentFormState {
  name: string;
  color: string;
  plan: string[];
  role: string;
  industry: string;
  location: string;
  minCompanySize: string;
  maxCompanySize: string;
}

const defaultForm = (): SegmentFormState => ({
  name: "",
  color: "#6366f1",
  plan: [],
  role: "",
  industry: "",
  location: "",
  minCompanySize: "",
  maxCompanySize: "",
});

function filtersFromForm(form: SegmentFormState): SegmentFilters {
  const filters: SegmentFilters = {};
  if (form.plan.length) filters.plan = form.plan;
  if (form.role.trim()) filters.role = [form.role.trim()];
  if (form.industry.trim()) filters.industry = [form.industry.trim()];
  if (form.location.trim()) filters.location = [form.location.trim()];
  const min = Number.parseInt(form.minCompanySize, 10);
  const max = Number.parseInt(form.maxCompanySize, 10);
  if (!Number.isNaN(min) && min > 0) filters.minCompanySize = min;
  if (!Number.isNaN(max) && max > 0) filters.maxCompanySize = max;
  return filters;
}

function formFromSegment(seg: Segment): SegmentFormState {
  return {
    name: seg.name,
    color: seg.color,
    plan: seg.filters.plan ?? [],
    role: seg.filters.role?.[0] ?? "",
    industry: seg.filters.industry?.[0] ?? "",
    location: seg.filters.location?.[0] ?? "",
    minCompanySize: seg.filters.minCompanySize?.toString() ?? "",
    maxCompanySize: seg.filters.maxCompanySize?.toString() ?? "",
  };
}

function SegmentForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: SegmentFormState;
  onSave: (form: SegmentFormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<SegmentFormState>(initial);

  function togglePlan(p: string) {
    setForm((f) => ({
      ...f,
      plan: f.plan.includes(p) ? f.plan.filter((x) => x !== p) : [...f.plan, p],
    }));
  }

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/40">
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm((f) => ({ ...f, color: c }))}
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
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="flex-1 px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div>
        <p className="text-xs text-muted-foreground font-medium mb-1.5">Customer plan</p>
        <div className="flex flex-wrap gap-1.5">
          {PLAN_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePlan(p)}
              className={cn(
                "px-2.5 py-1 text-[12.5px] rounded-md border capitalize transition-colors",
                form.plan.includes(p)
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {p}
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
              onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
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
            onChange={(e) => setForm((f) => ({ ...f, minCompanySize: e.target.value }))}
            className="w-full px-2.5 py-1.5 text-[13px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground shrink-0">to</span>
          <input
            type="number"
            min={1}
            placeholder="Max"
            value={form.maxCompanySize}
            onChange={(e) => setForm((f) => ({ ...f, maxCompanySize: e.target.value }))}
            className="w-full px-2.5 py-1.5 text-[13px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
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
          className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" /> Save segment
        </button>
      </div>
    </div>
  );
}

export default function SegmentsSettings({ loaderData }: Route.ComponentProps) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const revalidator = useRevalidator();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["segments", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/segments");
      return res.json() as Promise<{ segments: Segment[] }>;
    },
    initialData: { segments: loaderData.segments },
    staleTime: 30_000,
  });
  const segments = data?.segments ?? [];

  const { mutate } = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch("/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Request failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["segments", orgSlug] });
      revalidator.revalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleCreate(form: SegmentFormState) {
    mutate({
      intent: "create",
      name: form.name,
      color: form.color,
      filters: filtersFromForm(form),
    });
    setCreating(false);
    toast.success("Segment created");
  }

  function handleUpdate(id: string, form: SegmentFormState) {
    mutate({
      intent: "update",
      id,
      name: form.name,
      color: form.color,
      filters: filtersFromForm(form),
    });
    setEditingId(null);
    toast.success("Segment updated");
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete segment "${name}"?`)) return;
    mutate({ intent: "delete", id });
    toast.success("Segment deleted");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1">
            <h1 className="text-sm font-semibold">Segments</h1>
            <p className="text-xs text-muted-foreground">
              Group end-users by traits to filter feedback by audience.
            </p>
          </div>
          {loaderData.isAdmin && !creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> New segment
            </button>
          )}
        </header>

        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-2xl space-y-4">
            <div className="rounded-lg border border-border p-4 text-sm bg-muted/30">
              <p className="font-medium text-foreground mb-1">Identify users via API</p>
              <p className="text-muted-foreground text-[13px] mb-2">
                Push customer traits from your backend using your API key:
              </p>
              <pre className="text-[12px] bg-muted rounded p-3 overflow-x-auto text-foreground">{`POST /api/user-profiles
Authorization: Bearer <your-api-key>

{
  "email": "user@example.com",
  "externalId": "cus_abc123",
  "traits": {
    "plan": "paying",
    "role": "founder",
    "companySize": 12,
    "industry": "SaaS"
  }
}`}</pre>
            </div>

            {creating && (
              <SegmentForm
                initial={defaultForm()}
                onSave={handleCreate}
                onCancel={() => setCreating(false)}
              />
            )}

            {segments.length === 0 && !creating ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-sm font-medium">No segments yet</p>
                <p className="text-xs mt-1">
                  Create a segment to filter feedback by customer traits.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {segments.map((seg) =>
                  editingId === seg.id ? (
                    <SegmentForm
                      key={seg.id}
                      initial={formFromSegment(seg)}
                      onSave={(form) => handleUpdate(seg.id, form)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div
                      key={seg.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                    >
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{seg.name}</p>
                          {seg.memberCount != null && (
                            <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                              {seg.memberCount.toLocaleString()}{" "}
                              {seg.memberCount === 1 ? "user" : "users"}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-muted-foreground truncate">
                          {describeFilters(seg.filters)}
                        </p>
                      </div>
                      {loaderData.isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingId(seg.id)}
                            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(seg.id, seg.name)}
                            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function describeFilters(filters: SegmentFilters): string {
  const parts: string[] = [];
  if (filters.plan?.length) parts.push(`Plan: ${filters.plan.join(", ")}`);
  if (filters.role?.length) parts.push(`Role: ${filters.role.join(", ")}`);
  if (filters.industry?.length) parts.push(`Industry: ${filters.industry.join(", ")}`);
  if (filters.location?.length) parts.push(`Location: ${filters.location.join(", ")}`);
  if (filters.minCompanySize != null && filters.maxCompanySize != null)
    parts.push(`${filters.minCompanySize}–${filters.maxCompanySize} employees`);
  else if (filters.minCompanySize != null) parts.push(`≥${filters.minCompanySize} employees`);
  else if (filters.maxCompanySize != null) parts.push(`≤${filters.maxCompanySize} employees`);
  return parts.length ? parts.join(" · ") : "No filters defined";
}
