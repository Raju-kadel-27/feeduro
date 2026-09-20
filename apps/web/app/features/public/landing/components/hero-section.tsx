import { BarChart2, Star } from "lucide-react";
import { Link } from "react-router";

const AVATAR_PHOTOS = [
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/68.jpg",
  "https://randomuser.me/api/portraits/men/75.jpg",
  "https://randomuser.me/api/portraits/women/90.jpg",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-36 pb-10">
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
          className="absolute -top-40 left-0 -translate-x-1/3 w-[800px] h-[600px] rounded-full"
          style={{ background: "rgba(59,130,246,0.12)", filter: "blur(140px)" }}
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
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-gray-900 px-4 py-1.5 text-sm font-semibold text-gray-900 mb-8 animate-slide-up-fade">
            <BarChart2 className="w-3.5 h-3.5 text-gray-900" />
            <span>Analytics rich feedback board</span>
          </div>

          <h1
            className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.05] mb-6 animate-slide-up-fade"
            style={{ animationDelay: "80ms" }}
          >
            <span className="block text-gray-800">Every customer idea.</span>
            <span className="block landing-gradient-text-animated">One place.</span>
          </h1>

          <p
            className="text-lg sm:text-xl text-gray-700 max-w-xl mx-auto mb-8 animate-slide-up-fade font-['Roboto'] font-light"
            style={{ animationDelay: "180ms" }}
          >
            Collect feature requests, understand what customers need most, and notify them
            the moment you ship.{" "}
            <strong className="text-foreground">No more feedback lost in Slack or email.</strong>
          </p>

          {/* CTA */}
          <div
            className="flex flex-col items-center gap-5 animate-slide-up-fade"
            style={{ animationDelay: "280ms" }}
          >
            <Link
              to="/sign-up"
              className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-gray-800 transition-colors"
            >
              Start for free
              <span aria-hidden>→</span>
            </Link>

            {/* Social proof */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {AVATAR_PHOTOS.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm"
                  />
                ))}
              </div>
              <div className="w-px h-7 bg-gray-200" />
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex gap-px">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  Join{" "}
                  <strong className="text-gray-800 font-semibold">50+ product teams</strong>
                </p>
              </div>
            </div>
          </div>

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
              src="https://res.cloudinary.com/dlimsxfkf/video/upload/v1785672573/product__demo__clip_ecrb9x.mp4"
              poster="https://res.cloudinary.com/dlimsxfkf/image/upload/v1785663162/step_1_lirohu.png"
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
