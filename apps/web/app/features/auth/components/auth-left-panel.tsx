import { MessageSquare } from "lucide-react";
import { Link } from "react-router";

export function AuthLeftPanel() {
  return (
    <div className="hidden lg:flex w-1/2 flex-col justify-between p-10 relative bg-[#111214] overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(255 255 255 / 0.03)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e\")",
        }}
      />

      <Link to="/" className="relative z-10 flex items-center gap-2 font-semibold text-white">
        <div className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white">
          <MessageSquare className="size-4" />
        </div>
        Feeduro
      </Link>

      <div className="relative z-10 max-w-xs space-y-4">
        <h2 className="text-3xl font-semibold tracking-tight text-white leading-snug">
          Feedback that actually gets shipped.
        </h2>
        <p className="text-sm text-white/45 leading-relaxed">
          Most customers don't leave over pricing — they leave because they asked for something,
          heard nothing, and moved on. Feeduro closes that gap.
        </p>
      </div>

      <div className="relative z-10 border-t border-white/[0.08] pt-6">
        <p className="text-xs text-white/30">Free to start · No credit card required</p>
      </div>
    </div>
  );
}
