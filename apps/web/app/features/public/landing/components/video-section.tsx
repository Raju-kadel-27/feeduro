import { PlayCircle } from "lucide-react";

export function VideoSection() {
  return (
    <section className="relative overflow-hidden py-20">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.06) 50%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        {/* Label */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
            <PlayCircle className="w-3.5 h-3.5 text-blue-500" />
            <span>Video Walkthrough</span>
          </div>
        </div>

        {/* Gradient-border wrapper */}
        <div
          className="relative p-px rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.35) 0%, rgba(139,92,246,0.3) 40%, rgba(245,158,11,0.25) 80%, rgba(234,88,12,0.2) 100%)",
          }}
        >
          {/* Inner card */}
          <div className="rounded-[15px] overflow-hidden bg-white shadow-[0_24px_80px_rgba(0,0,0,0.1)]">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-50 border-b border-slate-200">
              <span className="w-3 h-3 rounded-full bg-red-400/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
              <span className="w-3 h-3 rounded-full bg-green-400/70" />
              <div className="ml-3 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-400 font-mono tracking-tight">
                app.feeduro.com
              </div>
            </div>

            {/* Video */}
            <video
              src="https://res.cloudinary.com/dlimsxfkf/video/upload/v1782641096/Untitled_design_1_mk3hmr.mp4"
              autoPlay
              muted
              loop
              playsInline
              controls
              className="w-full h-auto block"
              aria-label="Feeduro product walkthrough"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
