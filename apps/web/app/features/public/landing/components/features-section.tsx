import { BarChart2, Code2, Fingerprint, Globe, KeyRound, LayoutList, Map, Newspaper, Puzzle, ScrollText, Smile, Webhook } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
};

const FEATURES: Feature[] = [
  // Core feedback loop — why people sign up
  {
    icon: LayoutList,
    title: "Public Feedback Boards",
    description: "A public board where users share ideas, vote on what matters, and watch their requests move forward. No moderation overhead.",
    iconBg: "rgba(59,130,246,0.12)",
    iconColor: "rgb(59,130,246)",
  },
  {
    icon: Map,
    title: "Product Roadmap",
    description: "A live roadmap that reflects what users voted for. Every item links back to the original request so users know you listened.",
    iconBg: "rgba(139,92,246,0.12)",
    iconColor: "rgb(139,92,246)",
  },
  {
    icon: Newspaper,
    title: "Changelog",
    description: "Publish what you shipped and Feeduro notifies everyone who voted for it. The loop closes itself.",
    iconBg: "rgba(20,184,166,0.12)",
    iconColor: "rgb(20,184,166)",
  },
  {
    icon: Code2,
    title: "Embeddable Widget",
    description: "One script tag. Feedback form lives inside your app. Users submit ideas without ever leaving what they were doing.",
    iconBg: "rgba(236,72,153,0.12)",
    iconColor: "rgb(236,72,153)",
  },
  // Ease & ownership — removes the next layer of objections
  {
    icon: Smile,
    title: "Simple to Use",
    description: "No onboarding calls, no setup week. Most teams are up and collecting feedback within ten minutes of signing up.",
    iconBg: "rgba(132,204,22,0.12)",
    iconColor: "rgb(132,204,22)",
  },
  {
    icon: Globe,
    title: "Branding & Custom Domain",
    description: "Use your own domain and remove all Feeduro branding. Your users see your product, not ours.",
    iconBg: "rgba(99,102,241,0.12)",
    iconColor: "rgb(99,102,241)",
  },
  // Data & workflow — for teams that want more
  {
    icon: BarChart2,
    title: "Analytics",
    description: "See demand by feature, spot trends over time, and prioritize with real data instead of the loudest voice in the room.",
    iconBg: "rgba(16,185,129,0.12)",
    iconColor: "rgb(16,185,129)",
  },
  {
    icon: Puzzle,
    title: "16+ Integrations",
    description: "Push user requests directly into Jira, Linear, Asana, Slack, and 12 more tools. Your existing workflow, unchanged.",
    iconBg: "rgba(249,115,22,0.12)",
    iconColor: "rgb(249,115,22)",
  },
  // Developer & enterprise — power users and compliance
  {
    icon: Webhook,
    title: "Webhooks",
    description: "Get real-time events in your own systems when feedback is submitted, a status changes, or a changelog post goes live.",
    iconBg: "rgba(6,182,212,0.12)",
    iconColor: "rgb(6,182,212)",
  },
  {
    icon: KeyRound,
    title: "API Keys",
    description: "Give your developers programmatic access to everything Feeduro offers. Build on top of your feedback data your way.",
    iconBg: "rgba(234,179,8,0.12)",
    iconColor: "rgb(234,179,8)",
  },
  {
    icon: ScrollText,
    title: "Audit Logs",
    description: "Every action, every change, every access — logged with who did it and when. Compliance and accountability without extra tooling.",
    iconBg: "rgba(245,158,11,0.12)",
    iconColor: "rgb(245,158,11)",
  },
  {
    icon: Fingerprint,
    title: "Passkeys",
    description: "Sign in with Face ID, Touch ID, or a hardware key. No passwords to steal, no magic links to wait for.",
    iconBg: "rgba(124,58,237,0.12)",
    iconColor: "rgb(124,58,237)",
  },
];

function FeatureCard({ icon: Icon, title, description, iconBg, iconColor }: Feature) {
  return (
    <div className="flex flex-col p-7 rounded-2xl border border-border bg-card hover:border-border/60 hover:-translate-y-0.5 transition-all duration-200">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shrink-0"
        style={{ background: iconBg }}
      >
        <Icon className="w-7 h-7" style={{ color: iconColor }} />
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Everything your team needs
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            From the first idea to the shipped feature. No duct tape, no switching between tools.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}
