import { Layers, Megaphone, MessageSquare } from "lucide-react";
import { Link } from "react-router";

const features = [
  {
    Icon: MessageSquare,
    title: "One place for all feedback",
    description:
      "A public board your users actually visit. No more digging through emails, Slack, or spreadsheets.",
  },
  {
    Icon: Layers,
    title: "Prioritize with real data",
    description:
      "See what customers actually want, ranked by votes and business impact — not whoever shouted loudest in the meeting.",
  },
  {
    Icon: Megaphone,
    title: "Close the loop",
    description:
      "Publish a changelog and auto-notify everyone who asked. Turn feature reporters into loyal advocates.",
  },
];

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

      <div className="relative z-10 flex flex-col gap-8 max-w-sm">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight text-white leading-snug">
            Turn feedback into features, not noise
          </h2>
          <p className="text-sm text-white/50 leading-relaxed">
            Everything your product team needs to collect, prioritize, and ship — without the chaos.
          </p>
        </div>

        <div className="border-l-2 border-white/20 pl-4 space-y-1">
          <p className="text-sm font-medium text-white/80 leading-snug">
            Silence is your biggest churn driver.
          </p>
          <p className="text-sm text-white/45 leading-relaxed">
            Most customers don't leave over pricing or bugs — they leave because they asked for
            something, heard nothing, and quietly moved on. Feeduro fixes that.
          </p>
        </div>

        <ul className="space-y-6">
          {features.map(({ Icon, title, description }) => (
            <li key={title} className="flex gap-4">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.06]">
                <Icon className="size-4 text-white/60" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/85">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/45">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10 border-t border-white/[0.08] pt-6">
        <p className="text-xs text-white/30">Free to start. No credit card required.</p>
      </div>
    </div>
  );
}
