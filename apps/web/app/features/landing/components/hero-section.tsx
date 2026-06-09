import { Zap } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(148 163 184 / 0.02)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e\")",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full"
          style={{ background: "rgba(59,130,246,0.18)", filter: "blur(120px)" }}
        />
        <div
          className="absolute top-20 -left-48 w-[400px] h-[350px] rounded-full"
          style={{ background: "rgba(139,92,246,0.12)", filter: "blur(100px)" }}
        />
        <div
          className="absolute top-20 -right-48 w-[400px] h-[350px] rounded-full"
          style={{ background: "rgba(20,184,166,0.12)", filter: "blur(100px)" }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 backdrop-blur px-4 py-1.5 text-sm text-muted-foreground mb-8 animate-slide-up-fade">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span>Trusted by product teams worldwide</span>
          </div>
          <h2
            className="text-2xl sm:text-4xl font-semibold text-foreground/80 mb-2 animate-slide-up-fade"
            style={{ animationDelay: "80ms" }}
          >
            The feedback platform for growing teams
          </h2>
          <h1
            className="text-6xl sm:text-7xl font-black tracking-tight leading-none mb-6 animate-slide-up-fade"
            style={{ animationDelay: "100ms" }}
          >
            <span className="landing-gradient-text-animated">Feediyo</span>
          </h1>
          <p
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-slide-up-fade"
            style={{ animationDelay: "200ms" }}
          >
            Give users a place to share ideas. Show them what you are building.
            Tell them when it ships. That is the whole loop, and Feediyo handles all of it.
          </p>
        </div>

        <div
          className="animate-slide-up-fade"
          style={{ animationDelay: "400ms" }}
        >
          <div className="rounded-2xl border border-border shadow-2xl overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/40">
              <span className="w-3 h-3 rounded-full bg-red-400/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
              <span className="w-3 h-3 rounded-full bg-green-400/70" />
              <div className="ml-3 rounded-md border border-border bg-background/50 px-3 py-1 text-xs text-muted-foreground">
                app.feediyo.com
              </div>
            </div>
            <img
              src="/screenshots/landing.png"
              alt="Feediyo feedback board"
              className="w-full h-auto block"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
