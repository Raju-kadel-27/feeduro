import { LandingFooter } from "@features/public/landing/components/landing-footer";
import { LandingNav } from "@features/public/landing/components/landing-nav";
import { IntegrationsSection } from "@features/public/landing/components/integrations-section";

export function meta() {
  return [
    { title: "Integrations — Feeduro" },
    { name: "description", content: "Connect Feeduro with your favourite tools — Jira, Linear, Asana, Slack, GitHub, and more." },
  ];
}

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />

      <div className="relative overflow-hidden pt-32 pb-4">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(148 163 184 / 0.04)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e\")",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-40 left-0 -translate-x-1/3 w-[800px] h-[500px] rounded-full"
            style={{ background: "rgba(59,130,246,0.10)", filter: "blur(140px)" }}
          />
          <div
            className="absolute top-20 -right-48 w-[400px] h-[350px] rounded-full"
            style={{ background: "rgba(139,92,246,0.08)", filter: "blur(100px)" }}
          />
        </div>

        <div className="relative z-10 text-center max-w-2xl mx-auto px-6 mb-4">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
            Integrate with your favourite apps
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Built-in <strong className="text-foreground">2-way sync</strong> with the tools your team already lives in — no copy-paste, no manual updates.
          </p>
        </div>
      </div>

      <IntegrationsSection hideHeader />

      <LandingFooter />
    </div>
  );
}
