import type { LucideIcon } from "lucide-react";
import { Eye, Inbox, Megaphone, Repeat } from "lucide-react";

const OUTCOMES: { icon: LucideIcon; title: string; body: string; iconBg: string; iconColor: string }[] = [
  {
    icon: Inbox,
    title: "No more scattered feedback",
    body: "No Slack threads, email chains, or Notion docs. One board. Everything in it. Your team always knows where to look.",
    iconBg: "rgba(59,130,246,0.12)",
    iconColor: "rgb(59,130,246)",
  },
  {
    icon: Eye,
    title: "Users see their idea moving",
    body: "A public status board shows users their voice matters. Most products skip this step. Yours will not.",
    iconBg: "rgba(139,92,246,0.12)",
    iconColor: "rgb(139,92,246)",
  },
  {
    icon: Megaphone,
    title: "Every release feels personal",
    body: "Telling a user 'the thing you asked for just shipped' is the most powerful retention message you can send. Feeduro sends it automatically.",
    iconBg: "rgba(249,115,22,0.12)",
    iconColor: "rgb(249,115,22)",
  },
  {
    icon: Repeat,
    title: "Users who feel heard come back",
    body: "Progress notifications bring users back, not because you advertised, but because you delivered on what they asked for.",
    iconBg: "rgba(16,185,129,0.12)",
    iconColor: "rgb(16,185,129)",
  },
];

export function OutcomesSection() {
  return (
    <section className="py-24 px-6 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            When users feel heard, everything changes.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {OUTCOMES.map(({ icon: Icon, title, body, iconBg, iconColor }) => (
            <div
              key={title}
              className="flex gap-4 p-6 rounded-2xl border border-border bg-card/40 hover:bg-card/70 transition-colors"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: iconBg }}
              >
                <Icon className="w-5 h-5" style={{ color: iconColor }} />
              </div>
              <div>
                <h3 className="font-semibold mb-1.5">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
