import { TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

function Callout({
  title,
  accent = "green",
  children,
}: {
  title: string;
  accent?: "green" | "orange";
  children: React.ReactNode;
}) {
  const border = accent === "green" ? "border-emerald-500/25" : "border-orange-500/25";
  const bg = accent === "green" ? "bg-emerald-500/[0.05]" : "bg-orange-500/[0.05]";
  return (
    <div className={`rounded-xl border ${border} ${bg} p-4 shadow-lg min-w-[170px] lg:min-w-0`}>
      <p className="text-xs font-semibold text-foreground/90 mb-3 leading-tight">{title}</p>
      {children}
    </div>
  );
}

function BrowserFrame({ glow, children }: { glow: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-border overflow-hidden bg-card"
      style={{ boxShadow: `0 0 70px ${glow}, 0 20px 50px -12px rgba(0,0,0,0.5)` }}
    >
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/40">
        <span className="w-3 h-3 rounded-full bg-red-400/70" />
        <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
        <span className="w-3 h-3 rounded-full bg-green-400/70" />
        <div className="ml-3 rounded-md border border-border bg-background/50 px-3 py-1 text-xs text-muted-foreground">
          app.feeduro.com
        </div>
      </div>
      {children}
    </div>
  );
}

function AnalyticsShowcaseCard() {
  return (
    <div
      className="rounded-3xl px-4 py-10 lg:px-6"
      style={{ background: "radial-gradient(ellipse 80% 65% at 50% 50%, rgba(16,185,129,0.07) 0%, transparent 100%)" }}
    >
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span
          className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
          style={{ background: "rgba(16,185,129,0.12)" }}
        >
          Analytics
        </span>
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
          See exactly what is{" "}
          <span style={{ background: "linear-gradient(135deg, #6ee7b7, #34d399, #5eead4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>driving demand</span>
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          Traffic trends, voting patterns, and resolution rates across every board. Know what your users want before they have to ask twice.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_210px] gap-6 lg:gap-8 items-center">
        <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
          <Callout title="Unique visitors and total views per board">
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-xl font-bold text-emerald-400">1,284</span>
              <span className="text-xs text-muted-foreground">views this week</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-400 mb-3">
              <TrendingUp className="w-3 h-3" />
              <span>+12% from last week</span>
            </div>
            <svg viewBox="0 0 80 20" className="w-full h-5 opacity-70" aria-hidden>
              <polyline
                points="0,18 15,13 28,8 42,11 57,5 72,3 80,4"
                fill="none"
                stroke="rgb(16,185,129)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Callout>

          <Callout title="Backlog aging to catch stale feedback early">
            <div className="space-y-2">
              {[
                { label: "> 60 days", count: 3, color: "bg-red-400" },
                { label: "30–60 days", count: 8, color: "bg-amber-400" },
                { label: "< 30 days", count: 24, color: "bg-emerald-400" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${row.color}`} />
                  <span className="text-muted-foreground flex-1">{row.label}</span>
                  <span className="font-semibold text-foreground">{row.count}</span>
                </div>
              ))}
            </div>
          </Callout>
        </div>

        <div className="order-first lg:order-none">
          <BrowserFrame glow="rgba(16,185,129,0.18)">
            <div className="relative">
              <img src="/screenshots/analytics.png" alt="Feeduro analytics dashboard" className="w-full h-auto block animate-crossfade-a" />
              <img
                src="/screenshots/analytics-second.png"
                alt="Feeduro analytics dashboard"
                className="absolute inset-0 w-full h-full object-cover animate-crossfade-b"
                loading="lazy"
              />
            </div>
          </BrowserFrame>
        </div>

        <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
          <Callout title="Resolution rate and team response tracking">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 shrink-0">
                <svg viewBox="0 0 36 36" className="w-11 h-11 -rotate-90" aria-hidden>
                  <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" className="stroke-border" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgb(16,185,129)" strokeWidth="3" strokeDasharray="78 22" strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-emerald-400">78%</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">78% resolved</p>
                <p className="text-xs text-muted-foreground">Avg. 3.2 day response</p>
              </div>
            </div>
          </Callout>

          <Callout title="Voting patterns across boards">
            <div className="space-y-2">
              {[
                { label: "Dark mode", votes: 42, pct: 90 },
                { label: "CSV export", votes: 31, pct: 66 },
                { label: "API access", votes: 18, pct: 38 },
              ].map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium text-foreground">{row.votes}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Callout>
        </div>
      </div>
    </div>
  );
}

const SEG_STEPS = [
  { src: "/segmentation/segment_step_1.png", label: "Define your segment" },
  { src: "/segmentation/segment_step_2.png", label: "Apply filters to your board" },
  { src: "/segmentation/segment_step_3.png", label: "See exactly what they need" },
];

function SegmentationShowcaseCard() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % SEG_STEPS.length), 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="rounded-3xl px-4 py-10 lg:px-6"
      style={{ background: "radial-gradient(ellipse 80% 65% at 50% 50%, rgba(249,115,22,0.07) 0%, transparent 100%)" }}
    >
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span
          className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
          style={{ background: "rgba(249,115,22,0.12)" }}
        >
          Segmentation
        </span>
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
          What are your{" "}
          <span style={{ background: "linear-gradient(135deg, #fdba74, #fb923c, #fcd34d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>paying users</span> asking for?
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          Group users by plan, role, or company size. Filter boards instantly to separate what free users want from what enterprise accounts need.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_210px] gap-6 lg:gap-8 items-center">
        <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
          <Callout title="Create segments from any user trait" accent="orange">
            <div className="space-y-1.5">
              {[
                { key: "Plan", value: "Pro" },
                { key: "Role", value: "Admin" },
                { key: "Seats", value: "≥ 50" },
              ].map((row) => (
                <div key={row.key} className="flex items-center gap-2 text-xs bg-muted/40 rounded-md px-2 py-1">
                  <span className="text-muted-foreground w-10 shrink-0">{row.key}</span>
                  <span className="text-muted-foreground">=</span>
                  <span className="font-medium text-orange-400">{row.value}</span>
                </div>
              ))}
            </div>
          </Callout>

          <Callout title="Filter boards by segment instantly" accent="orange">
            <div className="flex flex-wrap gap-1.5">
              {["Paying", "Enterprise", "Churned"].map((label, i) => (
                <span
                  key={label}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${i === 0 ? "border-orange-400/50 text-orange-400 bg-orange-400/10" : "border-border text-muted-foreground"}`}
                >
                  {label}
                </span>
              ))}
              <span className="text-[10px] text-muted-foreground px-2 py-0.5">+ Add</span>
            </div>
          </Callout>
        </div>

        <div className="order-first lg:order-none">
          <BrowserFrame glow="rgba(249,115,22,0.18)">
            <div className="relative">
              {SEG_STEPS.map(({ src }, i) => (
                <img
                  key={src}
                  src={src}
                  alt={`Feeduro segmentation step ${i + 1}`}
                  loading={i === 0 ? "eager" : "lazy"}
                  className={[
                    "w-full h-auto block transition-opacity duration-500",
                    i > 0 ? "absolute inset-0 object-cover" : "",
                    step === i ? "opacity-100" : "opacity-0",
                  ].join(" ")}
                />
              ))}
              <div className="absolute inset-0 bg-orange-500/10 mix-blend-soft-light pointer-events-none" />
            </div>
          </BrowserFrame>
          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground tabular-nums">
              Step {step + 1} of {SEG_STEPS.length} — {SEG_STEPS[step].label}
            </p>
            <div className="flex gap-2">
              {SEG_STEPS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStep(i)}
                  aria-label={`Step ${i + 1}`}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${step === i ? "bg-orange-400" : "bg-border hover:bg-muted-foreground/40"}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
          <Callout title="Find what your most valuable users need" accent="orange">
            <div className="space-y-2">
              {[
                { label: "API access", plan: "Enterprise", votes: 24 },
                { label: "SSO login", plan: "Pro", votes: 18 },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2 text-xs">
                  <span className="text-foreground flex-1 font-medium">{row.label}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-400/10 text-orange-400 border border-orange-400/20">
                    {row.plan}
                  </span>
                  <span className="text-muted-foreground">▲ {row.votes}</span>
                </div>
              ))}
            </div>
          </Callout>

          <Callout title="Separate free vs paid feedback instantly" accent="orange">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { tier: "Free", color: "text-muted-foreground", items: ["Dark mode", "UI tweaks"] },
                { tier: "Paid", color: "text-orange-400", items: ["API access", "SSO login"] },
              ].map((col) => (
                <div key={col.tier}>
                  <p className={`font-semibold mb-1.5 ${col.color}`}>{col.tier}</p>
                  {col.items.map((item) => (
                    <p key={item} className="text-muted-foreground truncate">{item}</p>
                  ))}
                </div>
              ))}
            </div>
          </Callout>
        </div>
      </div>
    </div>
  );
}

export function ShowcaseSection() {
  return (
    <section id="showcase" className="py-24 px-6 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="space-y-16">
          <AnalyticsShowcaseCard />
          <SegmentationShowcaseCard />
        </div>
      </div>
    </section>
  );
}
