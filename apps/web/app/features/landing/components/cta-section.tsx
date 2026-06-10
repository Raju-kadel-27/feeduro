import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

export function CtaSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.08) 50%, rgba(20,184,166,0.08) 100%)",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full"
          style={{ background: "rgba(59,130,246,0.15)", filter: "blur(100px)" }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
          Your users have opinions about your product.
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
          Feeduro gives them a place to share. It gives you the intelligence to act on what
          matters most. Free to get started. No credit card required.
        </p>
        <Link
          to="/sign-up"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Get started for free <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
