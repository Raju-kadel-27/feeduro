import {
  Stepper,
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@components/ui/stepper";
import { Check, DollarSign, Download, Layers, Upload, X } from "lucide-react";
import { useState } from "react";

const STEPS = [
  {
    id: "plans",
    title: "Build your plan catalog",
    description: "Define pricing tiers for MRR resolution",
    icon: <DollarSign className="h-4 w-4" />,
  },
  {
    id: "import",
    title: "Import your customers",
    description: "Tag users with plan & billing info",
    icon: <Upload className="h-4 w-4" />,
  },
  {
    id: "segments",
    title: "Create segments",
    description: "Group customers by shared traits",
    icon: <Layers className="h-4 w-4" />,
  },
];

type StepId = "plans" | "import" | "segments";

interface Props {
  planCount: number;
  userCount: number;
  segmentCount: number;
  onOpenImport: () => void;
  onScrollToPlans: () => void;
  onCreateSegment: () => void;
  onDismiss: () => void;
}

const SAMPLE_CSV = [
  "email,plan,billingInterval,mrr,companyId,companyName,companyMrr",
  "alice@bigco.com,starter,annual,,bigco,BigCo,500",
  "bob@bigco.com,starter,monthly,,,",
  "carol@example.com,pro,,80,,,",
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

const pBtn =
  "inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors";
const sBtn =
  "inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-md border border-border hover:bg-accent transition-colors";
const doneBadge =
  "inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";

export function SegmentSetupGuide({
  planCount,
  userCount,
  segmentCount,
  onOpenImport,
  onScrollToPlans,
  onCreateSegment,
  onDismiss,
}: Props) {
  const allDone = planCount > 0 && userCount > 0 && segmentCount > 0;
  const [current, setCurrent] = useState<StepId>(() => {
    if (planCount === 0) return "plans";
    if (userCount === 0) return "import";
    return "segments";
  });
  const [importTab, setImportTab] = useState<"csv" | "api">("csv");

  if (allDone) return null;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3.5 border-b border-border">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Set up MRR-weighted feedback
          </p>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">
            Complete these three steps to see how much revenue is behind every feature request.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss setup guide"
          className="ml-4 shrink-0 p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Stepper */}
      <div className="p-5">
        <Stepper
          steps={STEPS}
          value={current}
          onValueChange={(v) => setCurrent(v as StepId)}
          orientation="vertical"
          indicators={{ completed: <Check className="h-4 w-4" /> }}
          className="flex gap-8 max-sm:flex-col"
        >
          {/* Left nav */}
          <StepperNav className="w-52 shrink-0">
            {STEPS.map((step, index) => (
              <StepperItem
                key={step.id}
                stepId={step.id}
                completed={
                  step.id === "plans"
                    ? planCount > 0
                    : step.id === "import"
                      ? userCount > 0
                      : segmentCount > 0
                }
                className="relative items-start"
              >
                <StepperTrigger className="items-start gap-3 pb-12 last:pb-0">
                  <StepperIndicator />
                  <div className="text-left pt-0.5">
                    <StepperTitle>{step.title}</StepperTitle>
                    <StepperDescription className="mt-0.5">{step.description}</StepperDescription>
                  </div>
                </StepperTrigger>
                {index < STEPS.length - 1 && (
                  <StepperSeparator className="absolute top-9 left-[15px] group-data-[orientation=vertical]/stepper-nav:h-12 group-data-[orientation=vertical]/stepper-nav:w-0.5" />
                )}
              </StepperItem>
            ))}
          </StepperNav>

          {/* Right panel */}
          <StepperPanel className="flex-1 min-w-0">

            {/* ── Step 1: Plan catalog ── */}
            <StepperContent value="plans">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">One entry per pricing tier</p>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    Create entries like{" "}
                    <code className="text-[11.5px] bg-muted px-1.5 py-0.5 rounded font-mono">starter</code>,{" "}
                    <code className="text-[11.5px] bg-muted px-1.5 py-0.5 rounded font-mono">pro</code>, or{" "}
                    <code className="text-[11.5px] bg-muted px-1.5 py-0.5 rounded font-mono">enterprise</code>.
                    Set a monthly price and an optional annual price — the system picks the right one per customer automatically.
                  </p>
                </div>

                <div className="rounded-md border border-border divide-y divide-border text-[12.5px]">
                  {[
                    { name: "starter", monthly: "$100/mo", annual: "$80/mo annual" },
                    { name: "pro",     monthly: "$250/mo", annual: "$200/mo annual" },
                  ].map((row) => (
                    <div key={row.name} className="flex items-center justify-between px-3 py-2">
                      <span className="font-medium capitalize">{row.name}</span>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{row.monthly}</span>
                        <span className="text-border">·</span>
                        <span>{row.annual}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[12px] text-muted-foreground">
                  Annual price is always entered as $/mo equivalent (e.g. $960/yr → <strong>80</strong>).
                  Leave blank if you don't offer annual for that tier.
                </p>

                {planCount > 0 ? (
                  <span className={doneBadge}>
                    <Check className="h-3 w-3" />
                    {planCount} {planCount === 1 ? "plan" : "plans"} configured
                  </span>
                ) : (
                  <button type="button" onClick={onScrollToPlans} className={pBtn}>
                    Open Plans &amp; pricing ↓
                  </button>
                )}
              </div>
            </StepperContent>

            {/* ── Step 2: Import customers ── */}
            <StepperContent value="import">
              <div className="space-y-4">
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  Tag each customer with a{" "}
                  <code className="text-[11.5px] bg-muted px-1.5 py-0.5 rounded font-mono">plan</code> and{" "}
                  <code className="text-[11.5px] bg-muted px-1.5 py-0.5 rounded font-mono">billingInterval</code>.
                  The system resolves their MRR from your catalog — no manual math needed.
                </p>

                {/* Tab toggle */}
                <div className="flex gap-0.5 p-0.5 rounded-md bg-muted w-fit text-[12.5px]">
                  {(["csv", "api"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setImportTab(tab)}
                      className={`px-3 py-1 rounded font-medium transition-colors ${
                        importTab === tab
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab === "csv" ? "CSV upload" : "API / identify"}
                    </button>
                  ))}
                </div>

                {importTab === "csv" ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px]">
                      {[
                        ["email",           "required — user identifier"],
                        ["plan",            "matches your catalog name"],
                        ["billingInterval", '"monthly" or "annual"'],
                        ["mrr",             "explicit $/mo — beats plan price"],
                        ["companyId",       "groups seats into one account"],
                        ["companyMrr",      "company MRR, counted once per post"],
                      ].map(([col, desc]) => (
                        <div key={col} className="flex items-baseline gap-1.5 min-w-0">
                          <code className="font-mono shrink-0 text-foreground">{col}</code>
                          <span className="text-muted-foreground truncate">{desc}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={onOpenImport} className={pBtn}>
                        <Upload className="h-3.5 w-3.5" /> Import CSV
                      </button>
                      <button type="button" onClick={downloadSample} className={sBtn}>
                        <Download className="h-3.5 w-3.5" /> Sample CSV
                      </button>
                    </div>
                  </div>
                ) : (
                  <pre className="text-[11.5px] bg-muted rounded-md p-3 overflow-x-auto leading-relaxed">{`POST /api/user-profiles
Authorization: Bearer <api-key>

{
  "email": "alice@bigco.com",
  "traits": {
    "plan": "starter",
    "billingInterval": "annual",  // picks $80/mo from catalog
    "mrr": 80                     // optional: explicit override
  },
  "companies": [{
    "externalId": "bigco",
    "monthlySpend": 500           // company MRR, deduped per post
  }]
}`}</pre>
                )}

                {/* MRR resolution chain */}
                <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    MRR resolution order
                  </p>
                  {[
                    { n: 1, filled: true,  left: "mrr field set",                right: "use it directly — highest priority" },
                    { n: 2, filled: true,  left: "plan + billingInterval",        right: "look up catalog price for that tier" },
                    { n: 3, filled: false, left: "no profile / no match",         right: "$0 — excluded from MRR totals" },
                  ].map(({ n, filled, left, right }) => (
                    <div key={n} className="flex items-center gap-2 text-[12px]">
                      <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center shrink-0 font-bold border ${filled ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"}`}>
                        {n}
                      </span>
                      <code className="bg-muted px-1 rounded text-[11px] shrink-0">{left}</code>
                      <span className="text-muted-foreground">{right}</span>
                    </div>
                  ))}
                </div>

                {userCount > 0 && (
                  <span className={doneBadge}>
                    <Check className="h-3 w-3" />
                    {userCount.toLocaleString()} {userCount === 1 ? "customer" : "customers"} imported
                  </span>
                )}
              </div>
            </StepperContent>

            {/* ── Step 3: Segments ── */}
            <StepperContent value="segments">
              <div className="space-y-4">
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  Segments are saved filters. Every feedback post shows MRR impact broken down by
                  segment — so you can see how much your annual vs. monthly customers care about each request.
                </p>

                <div className="rounded-md border border-border divide-y divide-border text-[12.5px]">
                  {[
                    { name: "Annual customers",     filters: "billingInterval = annual" },
                    { name: "High-value monthly",   filters: "billingInterval = monthly · MRR ≥ $200" },
                    { name: "Enterprise SaaS",      filters: "plan = enterprise · industry = SaaS" },
                  ].map(({ name, filters }) => (
                    <div key={name} className="flex items-center justify-between px-3 py-2 gap-4">
                      <span className="font-medium shrink-0">{name}</span>
                      <span className="text-muted-foreground text-right text-[11.5px]">{filters}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[12px] text-muted-foreground">
                  Filter dimensions: <strong>plan</strong>, <strong>billing interval</strong>, role, industry,
                  location, company size, and MRR range. Voters without a profile count as $0.
                </p>

                {segmentCount > 0 ? (
                  <span className={doneBadge}>
                    <Check className="h-3 w-3" />
                    {segmentCount} {segmentCount === 1 ? "segment" : "segments"} created
                  </span>
                ) : (
                  <button type="button" onClick={onCreateSegment} className={pBtn}>
                    Create your first segment ↓
                  </button>
                )}
              </div>
            </StepperContent>

          </StepperPanel>
        </Stepper>
      </div>
    </div>
  );
}
