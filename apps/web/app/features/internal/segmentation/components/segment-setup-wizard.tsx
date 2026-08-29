import { CsvImportDialog } from "@features/internal/segmentation/components/csv-import-dialog";
import { PlanCatalogManager } from "@features/internal/segmentation/components/plan-catalog-manager";
import type { SegmentFormState } from "@features/internal/segmentation/components/segment-form";
import {
  defaultForm,
  SegmentForm,
} from "@features/internal/segmentation/components/segment-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  DollarSign,
  Download,
  Layers,
  Upload,
} from "lucide-react";
import { useState } from "react";

const SAMPLE_CSV = [
  "email,plan,billingInterval,mrr,role,industry,location,companyId,companyName,companyMrr",
  "alice@bigco.com,starter,annual,,founder,saas,north america,bigco,bigco inc,500",
  "bob@bigco.com,starter,monthly,,,,,,,",
  "carol@example.com,pro,,80,engineer,fintech,europe,,,",
].join("\n");

function downloadSample() {
  const url = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: "feeduro-contacts-sample.csv",
  });
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  planCount: number;
  userCount: number;
  orgSlug: string;
  isAdmin: boolean;
  planOptions: string[];
  initialDraft?: string | null;
  onDraftChange: (draft: SegmentFormState) => void;
  onComplete: (form: SegmentFormState) => void;
  onImportSuccess: () => void;
  onSkip?: () => void;
}

type Step = 1 | 2 | 3;

const STEP_META = [
  { n: 1 as Step, label: "Plan catalog",      Icon: DollarSign },
  { n: 2 as Step, label: "Import customers",  Icon: Upload },
  { n: 3 as Step, label: "Create segment",    Icon: Layers },
];

export function SegmentSetupWizard({
  planCount,
  userCount,
  orgSlug,
  isAdmin,
  planOptions,
  initialDraft,
  onDraftChange,
  onComplete,
  onImportSuccess,
  onSkip,
}: Props) {
  const qc = useQueryClient();

  // Always open on the first incomplete step — no need to persist step position
  // separately since it's fully derivable from real data.
  const [step, setStep] = useState<Step>(
    planCount === 0 ? 1 : userCount === 0 ? 2 : 3,
  );

  function goToStep(s: Step) { setStep(s); }

  const [segmentDraft, setSegmentDraft] = useState<SegmentFormState>(() => {
    if (!initialDraft) return defaultForm();
    try { return JSON.parse(initialDraft) as SegmentFormState; } catch { return defaultForm(); }
  });

  function handleDraftChange(draft: SegmentFormState) {
    setSegmentDraft(draft);
    onDraftChange(draft);
  }

  function handleComplete(form: SegmentFormState) {
    onComplete(form);
  }

  const [importOpen, setImportOpen] = useState(false);
  const [importTab, setImportTab] = useState<"csv" | "api">("csv");

  const stepDone = [planCount > 0, userCount > 0, false];

  return (
    <div className="flex flex-col flex-1">
      {/* ── Progress header ── */}
      <div className="border-b border-border px-8 py-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg font-semibold">Set up MRR-weighted segments</p>
            <p className="text-sm text-muted-foreground">Your progress is saved automatically.</p>
          </div>

          <div className="flex items-center">
            {STEP_META.map((s, i) => (
              <div key={s.n} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  onClick={() => goToStep(s.n)}
                  className="flex items-center gap-3 shrink-0"
                >
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                      stepDone[i]
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : step === s.n
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {stepDone[i] ? <Check className="h-4 w-4" /> : s.n}
                  </span>
                  <span
                    className={`text-sm font-semibold hidden sm:block ${
                      step === s.n ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
                {i < STEP_META.length - 1 && (
                  <div
                    className={`flex-1 mx-3 h-px transition-colors ${
                      stepDone[i] ? "bg-emerald-500" : step > s.n ? "bg-primary/30" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Step content ── */}
      <div className="flex-1 overflow-y-auto px-8 pt-7 pb-10">
        <div className="max-w-2xl mx-auto space-y-8">

          {step === 1 && (
            <>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <DollarSign className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Build your plan catalog</h2>
                  <p className="text-base text-muted-foreground mt-1">Step 1 of 3</p>
                </div>
              </div>
              <p className="text-base text-muted-foreground leading-relaxed">
                Add one entry per pricing tier. The name must match exactly what you send in customer data.
                Enter annual prices as a monthly equivalent — e.g. $960/yr → <span className="font-medium text-foreground">80</span>.
              </p>
              <PlanCatalogManager initialPlans={[]} isAdmin={isAdmin} orgSlug={orgSlug} large />
              {planCount > 0 && (
                <p className="flex items-center gap-2 text-base font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="h-4 w-4" />
                  {planCount} {planCount === 1 ? "plan" : "plans"} configured — ready to continue
                </p>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Import your customers</h2>
                  <p className="text-base text-muted-foreground mt-1">Step 2 of 3</p>
                </div>
              </div>
              <p className="text-base text-muted-foreground leading-relaxed">
                Tag each customer with a plan and billing interval. We resolve their MRR from your
                catalog automatically — no manual math needed.
              </p>

              <div className="flex gap-0.5 p-1 rounded-lg bg-muted w-fit">
                {(["csv", "api"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setImportTab(tab)}
                    className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
                      importTab === tab
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === "csv" ? "CSV upload" : "API"}
                  </button>
                ))}
              </div>

              {importTab === "csv" ? (
                <div className="space-y-5">
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {(
                      [
                        ["email",           "required — user identifier"],
                        ["plan",            "lowercase — matches your catalog name"],
                        ["billingInterval", '"monthly" or "annual"'],
                        ["mrr",             "explicit $/mo — beats plan price"],
                        ["role",            "lowercase — e.g. founder, engineer"],
                        ["industry",        "lowercase — e.g. saas, fintech"],
                        ["location",        "lowercase — e.g. north america, europe"],
                        ["companyId",       "groups seats into one account"],
                        ["companyMrr",      "company MRR, counted once per post"],
                      ] as [string, string][]
                    ).map(([col, desc]) => (
                      <div key={col} className="flex items-baseline gap-4 px-5 py-3.5 text-base">
                        <code className="font-mono font-semibold text-foreground shrink-0 text-sm">{col}</code>
                        <span className="text-muted-foreground">{desc}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setImportOpen(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Upload className="h-5 w-5" /> Import CSV
                    </button>
                    <button
                      type="button"
                      onClick={downloadSample}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-base font-semibold border border-border hover:bg-accent transition-colors"
                    >
                      <Download className="h-5 w-5" /> Sample CSV
                    </button>
                  </div>
                </div>
              ) : (
                <pre className="text-sm bg-muted rounded-lg p-5 overflow-x-auto leading-relaxed">{`POST /api/user-profiles
Authorization: Bearer <api-key>

{
  "email": "alice@bigco.com",
  "traits": {
    "plan": "starter",
    "billingInterval": "annual",
    "mrr": 80
  },
  "companies": [{
    "externalId": "bigco",
    "monthlySpend": 500
  }]
}`}</pre>
              )}

              {userCount > 0 && (
                <p className="flex items-center gap-2 text-base font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="h-4 w-4" />
                  {userCount.toLocaleString()} customers imported — ready to continue
                </p>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Layers className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Create your first segment</h2>
                  <p className="text-base text-muted-foreground mt-1">Step 3 of 3</p>
                </div>
              </div>
              <p className="text-base text-muted-foreground leading-relaxed">
                Segments are saved filters. Every feedback post will show MRR impact broken down by
                segment — so you know exactly how much revenue is behind each feature request.
              </p>
              <SegmentForm
                initial={segmentDraft}
                onSave={handleComplete}
                onCancel={() => goToStep(2)}
                onChange={handleDraftChange}
                planOptions={planOptions}
                orgSlug={orgSlug}
              />
            </>
          )}

        </div>
      </div>

      {/* ── Footer nav (steps 1 + 2 only; step 3 uses SegmentForm's own buttons) ── */}
      {step < 3 && (
        <div className="border-t border-border px-8 py-5 shrink-0">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button
              type="button"
              onClick={() => goToStep((step - 1) as Step)}
              disabled={step === 1}
              aria-label="Back"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="flex flex-col items-end gap-1.5">
              <button
                type="button"
                onClick={() => goToStep((step + 1) as Step)}
                disabled={step === 1 ? planCount === 0 : userCount === 0}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue <ArrowRight className="h-5 w-5" />
              </button>
              {step === 1 && planCount === 0 && (
                <p className="text-xs text-muted-foreground">Add at least one plan above to continue</p>
              )}
              {step === 2 && userCount === 0 && (
                <p className="text-xs text-muted-foreground">Import at least one customer above to continue</p>
              )}
            </div>
          </div>
          {onSkip && (
            <div className="max-w-2xl mx-auto pt-3 text-center">
              <button
                type="button"
                onClick={onSkip}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
              >
                Skip setup for now
              </button>
            </div>
          )}
        </div>
      )}

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["segments", orgSlug] });
          onImportSuccess();
        }}
      />
    </div>
  );
}
