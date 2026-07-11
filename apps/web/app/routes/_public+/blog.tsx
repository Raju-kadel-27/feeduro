import { LandingFooter } from "@features/public/landing/components/landing-footer";
import { LandingNav } from "@features/public/landing/components/landing-nav";

export function meta() {
  return [
    { title: "Blog — Feeduro" },
    { name: "description", content: "Product updates, tips, and stories from the Feeduro team." },
  ];
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />

      <div className="relative overflow-hidden pt-32 pb-20">
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
        </div>

        <div className="relative z-10 text-center max-w-2xl mx-auto px-6 mb-16">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
            Blog
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Product updates, tips, and stories from the Feeduro team.
          </p>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl mb-4">✍️</p>
            <h2 className="text-xl font-semibold mb-2">Coming soon</h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              We're working on our first posts. Check back soon.
            </p>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
