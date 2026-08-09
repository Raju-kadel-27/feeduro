import { PageHeader } from "@components/common/page-header";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@components/ui/empty";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { PlanBanner } from "@features/internal/billing/components/plan-banner";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import { CompaniesManager } from "@features/internal/segmentation/components/companies-manager";
import { CsvImportDialog } from "@features/internal/segmentation/components/csv-import-dialog";
import { FilterChips } from "@features/internal/segmentation/components/filter-chips";
import { PlanCatalogManager } from "@features/internal/segmentation/components/plan-catalog-manager";
import type { SegmentFormState } from "@features/internal/segmentation/components/segment-form";
import {
  defaultForm,
  filtersFromForm,
  formFromSegment,
  SegmentForm,
} from "@features/internal/segmentation/components/segment-form";
import { SegmentSetupGuide } from "@features/internal/segmentation/components/segment-setup-guide";
import { SegmentSetupWizard } from "@features/internal/segmentation/components/segment-setup-wizard";
import { getOrgPlans, getOrgSegments, getSegmentMemberCounts } from "@features/internal/segmentation/server/service";
import type { PlanCatalogEntry, Segment } from "@features/internal/segmentation/types";
import { cn } from "@lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq, sql } from "drizzle-orm";
import { Layers, Pencil, Plus, Star, Trash2, Upload, Users2 } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useParams, useRevalidator } from "react-router";
import { toast } from "sonner";
import { member, segmentsSetup, userProfiles } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/segments";

export function meta() {
  return [{ title: "Segments — Feeduro" }];
}

export function shouldRevalidate() {
  return false;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

  const [memberRecord, segmentList, planLimits, userCountRows, orgRecord, planList] = await Promise.all([
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      columns: { role: true },
    }),
    getOrgSegments(db, organizationId),
    getOrgPlanLimits(db, organizationId),
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(userProfiles)
      .where(eq(userProfiles.organizationId, organizationId)),
    db.query.segmentsSetup.findFirst({
      where: eq(segmentsSetup.organizationId, organizationId),
      columns: { wizardSkipped: true, wizardDraft: true, guideDismissed: true },
    }),
    getOrgPlans(db, organizationId),
  ]);

  if (!planLimits.segments) return { planLocked: true as const };

  const memberCounts = await getSegmentMemberCounts(db, organizationId, segmentList);

  return {
    isAdmin: memberRecord?.role === "admin",
    segments: segmentList.map((s) => ({ ...s, memberCount: memberCounts[s.id] ?? 0 })),
    userProfileCount: userCountRows[0]?.count ?? 0,
    planCount: planList.length,
    segmentsWizardSkipped: orgRecord?.wizardSkipped ?? false,
    wizardDraft: orgRecord?.wizardDraft ?? null,
    guideDismissed: orgRecord?.guideDismissed ?? false,
  };
}

export default function SegmentsSettings({ loaderData }: Route.ComponentProps) {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  if ("planLocked" in loaderData) {
    return (
      <>
        <header className="flex h-14 shrink-0 items-center px-4">
        </header>
        <main className="p-6 space-y-6">
          <div className="max-w-[840px] mx-auto w-full">
            <PageHeader
              title="Segments"
              icon={Users2}
              action={
                <Link
                  to={`/${orgSlug}/settings/billing`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                >
                  <Star className="h-4 w-4 fill-amber-300 text-amber-300" aria-hidden="true" />
                  Upgrade
                </Link>
              }
            />
          </div>
          <div className="max-w-[840px] mx-auto w-full">
            <PlanBanner>
              Voter segments are available on the <span className="font-semibold">Professional</span> plan.
            </PlanBanner>
          </div>
        </main>
      </>
    );
  }
  const qc = useQueryClient();
  const revalidator = useRevalidator();
  const [creating, setCreating] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Optimistic local state — seeded from DB, immediately flipped on skip so the
  // UI responds without waiting for the revalidation round-trip.
  const [wizardSkipped, setWizardSkipped] = useState(loaderData.segmentsWizardSkipped);

  const { mutate: skipWizardMutation } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "skip-wizard" }),
      });
      if (!res.ok) throw new Error("Failed to save");
    },
    onSuccess: () => revalidator.revalidate(),
    onError: () => setWizardSkipped(false),
  });

  function handleSkipWizard() {
    setWizardSkipped(true);
    skipWizardMutation();
  }

  const plansCatalogRef = useRef<HTMLDivElement>(null);

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

  // Shares the cache key PlanCatalogManager invalidates, so newly added plans appear here at once.
  const { data: plansData } = useQuery({
    queryKey: ["plans", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/plans");
      return res.json() as Promise<{ plans: PlanCatalogEntry[] }>;
    },
    staleTime: 30_000,
  });
  const planOptions = (plansData?.plans ?? []).map((p) => p.name);

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

  const { mutate: saveDraft } = useMutation({
    mutationFn: async (draft: string) => {
      await fetch("/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "save-draft", draft }),
      });
    },
  });

  const { mutate: clearDraft } = useMutation({
    mutationFn: async () => {
      await fetch("/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "clear-draft" }),
      });
    },
  });

  const [guideDismissed, setGuideDismissed] = useState(loaderData.guideDismissed);
  const { mutate: dismissGuide } = useMutation({
    mutationFn: async () => {
      await fetch("/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "dismiss-guide" }),
      });
    },
    onError: () => setGuideDismissed(false),
  });

  function handleDismissGuide() {
    setGuideDismissed(true);
    dismissGuide();
  }

  function startCreating() {
    setEditingSegment(null);
    setCreating(true);
  }

  function startEditing(seg: Segment) {
    setCreating(false);
    setEditingSegment(seg);
  }

  function handleCreate(form: SegmentFormState) {
    mutate(
      { intent: "create", name: form.name, color: form.color, filters: filtersFromForm(form) },
      { onSuccess: () => toast.success("Segment created") },
    );
  }

  function handleUpdate(id: string, form: SegmentFormState) {
    mutate(
      { intent: "update", id, name: form.name, color: form.color, filters: filtersFromForm(form) },
      { onSuccess: () => toast.success("Segment updated") },
    );
    setEditingSegment(null);
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete segment "${name}"?`)) return;
    mutate({ intent: "delete", id });
    toast.success("Segment deleted");
  }

  const planCount = plansData?.plans.length ?? loaderData.planCount;
  const showWizard = segments.length === 0 && !wizardSkipped;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
      </header>

      {showWizard ? (
        <SegmentSetupWizard
          planCount={planCount}
          userCount={loaderData.userProfileCount}
          orgSlug={orgSlug ?? ""}
          isAdmin={loaderData.isAdmin}
          planOptions={planOptions}
          initialDraft={loaderData.wizardDraft}
          onDraftChange={(draft) => saveDraft(JSON.stringify(draft))}
          onComplete={(form) => {
            clearDraft();
            handleCreate(form);
          }}
          onImportSuccess={() => {
            qc.invalidateQueries({ queryKey: ["segments", orgSlug] });
            revalidator.revalidate();
          }}
          onSkip={handleSkipWizard}
        />
      ) : (
        <>
      <main className="p-6 space-y-8">
        <div className="max-w-[840px] mx-auto w-full">
          <PageHeader
            title="Segments"
            icon={Users2}
            action={loaderData.isAdmin ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[15px] font-semibold border border-border hover:bg-accent transition-colors cursor-pointer"
                >
                  <Upload className="h-4 w-4" /> Import CSV
                </button>
                <button
                  type="button"
                  onClick={startCreating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> New segment
                </button>
              </div>
            ) : undefined}
          />
        </div>

        {wizardSkipped && !guideDismissed && (
          <div className="max-w-[840px] mx-auto w-full">
            <SegmentSetupGuide
              planCount={planCount}
              userCount={loaderData.userProfileCount}
              segmentCount={segments.length}
              onOpenImport={() => setImportOpen(true)}
              onScrollToPlans={() => plansCatalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              onCreateSegment={startCreating}
              onDismiss={handleDismissGuide}
            />
          </div>
        )}

        <div className="max-w-[840px] mx-auto w-full space-y-4">
          {/* Inline create form */}
          {creating && (
            <div className="rounded-lg border border-border p-4 bg-muted/40 animate-in slide-in-from-top-2 fade-in duration-150">
              <p className="text-sm font-medium mb-4">New segment</p>
              <SegmentForm
                initial={defaultForm()}
                onSave={(form) => {
                  handleCreate(form);
                  setCreating(false);
                }}
                onCancel={() => setCreating(false)}
                planOptions={planOptions}
                orgSlug={orgSlug}
              />
            </div>
          )}

          {/* API reference — collapsed by default */}
          <details className="rounded-lg border border-border bg-muted/30 group">
            <summary className="flex items-center justify-between p-4 cursor-pointer list-none text-base font-medium text-foreground select-none">
              <span>Identify users via API</span>
              <svg
                className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="px-4 pb-4">
              <p className="text-muted-foreground text-sm mb-3">
                Push customer traits from your backend using your API key:
              </p>
              <pre className="text-sm bg-muted rounded p-4 overflow-x-auto text-foreground leading-relaxed">{`POST /api/user-profiles
Authorization: Bearer <your-api-key>

{
  "email": "user@example.com",
  "externalId": "cus_abc123",
  "traits": {
    "plan": "starter",            // matches a name in your plan catalog
    "billingInterval": "annual",  // "monthly" | "annual" — picks monthly or annual price
    "mrr": 80,                    // explicit $/mo override — beats plan price entirely
    "role": "founder",
    "companySize": 12,
    "industry": "SaaS",
    "location": "North America"
  },
  "companies": [{
    "externalId": "bigco",
    "name": "BigCo",
    "monthlySpend": 500           // company MRR — counted once per company per post
  }]
}`}</pre>
            </div>
          </details>

          <div ref={plansCatalogRef}>
            <PlanCatalogManager
              initialPlans={[]}
              isAdmin={loaderData.isAdmin}
              orgSlug={orgSlug ?? ""}
            />
          </div>

          <CompaniesManager
            initialCompanies={[]}
            isAdmin={loaderData.isAdmin}
            orgSlug={orgSlug ?? ""}
          />

          {segments.length === 0 && !creating ? (
            <Empty className="border border-border">
              <EmptyMedia variant="icon" className="bg-teal-500/10 text-teal-600 dark:text-teal-400"><Layers /></EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No segments yet</EmptyTitle>
                <EmptyDescription>Create a segment to filter feedback by customer traits.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-2">
              {segments.map((seg) => (
                <div
                  key={seg.id}
                  className={cn(
                    "rounded-lg border border-border overflow-hidden bg-card",
                    editingSegment?.id === seg.id && "border-primary/40",
                  )}
                >
                  <div className="flex items-center gap-3 p-3">
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
                      <FilterChips filters={seg.filters} />
                    </div>
                    {loaderData.isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          aria-label={`Edit segment ${seg.name}`}
                          onClick={() => editingSegment?.id === seg.id ? setEditingSegment(null) : startEditing(seg)}
                          className={cn(
                            "p-1.5 rounded hover:bg-accent transition-colors",
                            editingSegment?.id === seg.id
                              ? "text-foreground bg-accent"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete segment ${seg.name}`}
                          onClick={() => handleDelete(seg.id, seg.name)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Inline edit form */}
                  {editingSegment?.id === seg.id && (
                    <div className="border-t border-border p-4 animate-in slide-in-from-top-1 fade-in duration-150">
                      <SegmentForm
                        initial={formFromSegment(editingSegment)}
                        onSave={(form) => handleUpdate(seg.id, form)}
                        onCancel={() => setEditingSegment(null)}
                        planOptions={planOptions}
                        orgSlug={orgSlug}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["segments", orgSlug] });
          revalidator.revalidate();
        }}
      />
        </>
      )}
    </>
  );
}
