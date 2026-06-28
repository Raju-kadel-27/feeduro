import { BarChart2 } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-20 pb-10">
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-1.5 text-sm font-semibold text-white mb-8 animate-slide-up-fade">
            <BarChart2 className="w-3.5 h-3.5 text-white" />
            <span>Analytics rich feedback board</span>
          </div>

          <h1
            className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.05] mb-6 animate-slide-up-fade"
            style={{ animationDelay: "80ms" }}
          >
            <span className="block text-foreground">Votes lie.</span>
            <span className="block landing-gradient-text-animated">Revenue doesn't.</span>
          </h1>

          <p
            className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-10 animate-slide-up-fade"
            style={{ animationDelay: "180ms" }}
          >
            See <strong className="text-foreground">who's asking</strong>, what they're worth, and the churn risk hiding behind every request. Build what moves revenue, not what gets the most upvotes.
          </p>

<p
            className="text-xs text-muted-foreground animate-slide-up-fade"
            style={{ animationDelay: "300ms" }}
          >
            Trusted by{" "}
            <span className="text-foreground font-medium">500+ product teams</span>
            {" "}· Free plan available
          </p>
        </div>

        <div
          className="animate-slide-up-fade"
          style={{ animationDelay: "420ms" }}
        >
          <div className="rounded-2xl border border-border shadow-2xl overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/40">
              <span className="w-3 h-3 rounded-full bg-red-400/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
              <span className="w-3 h-3 rounded-full bg-green-400/70" />
              <div className="ml-3 rounded-md border border-border bg-background/50 px-3 py-1 text-xs text-muted-foreground">
                app.feeduro.com
              </div>
            </div>
            <video
              src="https://res.cloudinary.com/dlimsxfkf/video/upload/v1782641096/Untitled_design_1_mk3hmr.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-auto block"
              aria-label="Feeduro feedback intelligence platform"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
