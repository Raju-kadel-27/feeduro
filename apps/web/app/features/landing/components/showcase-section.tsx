import { CheckCircle2 } from "lucide-react";

type ShowcaseItem = {
  tag: string;
  title: string;
  description: string;
  bullets: string[];
  imageSrc: string;
  imageSrc2?: string;
  imageAlt: string;
  accentColor: string;
};

const SHOWCASES: ShowcaseItem[] = [
  {
    tag: "Analytics",
    title: "See exactly what is driving demand",
    description:
      "Traffic trends, voting patterns, and resolution rates across every board. Know what your users want before they have to ask twice.",
    bullets: [
      "Unique visitors and total views per board",
      "Backlog aging to catch stale feedback early",
      "Resolution rate and team response tracking",
    ],
    imageSrc: "/screenshots/analytics.png",
    imageSrc2: "/screenshots/analytics-second.png",
    imageAlt: "Feeduro analytics dashboard",
    accentColor: "rgba(16,185,129,0.12)",
  },
  {
    tag: "Segmentation",
    title: "What are your paying users asking for?",
    description:
      "Group users by plan, role, or company size. Filter boards instantly to separate what free users want from what enterprise accounts need.",
    bullets: [
      "Create segments from any user trait",
      "Filter boards by paying, churned, or enterprise users",
      "Find out what your most valuable users need most",
    ],
    imageSrc: "/screenshots/segmentation.png",
    imageAlt: "Feeduro segmentation page",
    accentColor: "rgba(139,92,246,0.12)",
  },
  {
    tag: "Affiliate Program",
    title: "Earn while you grow",
    description:
      "Share a link. Earn 20% on every subscription your referral generates, for 12 months. Track every click, conversion, and payout in one place.",
    bullets: [
      "20% recurring commission for 12 months",
      "Track clicks, conversions, and pending payouts",
      "Request payouts via PayPal, Wise, or bank transfer",
    ],
    imageSrc: "/screenshots/affiliate.png",
    imageAlt: "Feeduro affiliate program dashboard",
    accentColor: "rgba(249,115,22,0.12)",
  },
];

function ShowcaseCard({ tag, title, description, bullets, imageSrc, imageSrc2, imageAlt, accentColor }: ShowcaseItem) {
  return (
    <div>
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span
          className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
          style={{ background: accentColor }}
        >
          {tag}
        </span>
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>

      <div className="flex flex-col items-center gap-2 mb-8">
        {bullets.map((b) => (
          <div key={b} className="flex items-start gap-2.5 text-sm text-muted-foreground w-full max-w-xs">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
            <span>{b}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border shadow-2xl overflow-hidden bg-card">
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/40">
          <span className="w-3 h-3 rounded-full bg-red-400/70" />
          <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
          <span className="w-3 h-3 rounded-full bg-green-400/70" />
          <div className="ml-3 rounded-md border border-border bg-background/50 px-3 py-1 text-xs text-muted-foreground">
            app.feeduro.com
          </div>
        </div>
        {imageSrc2 ? (
          <div className="relative">
            <img src={imageSrc} alt={imageAlt} className="w-full h-auto block animate-crossfade-a" />
            <img
              src={imageSrc2}
              alt={imageAlt}
              className="absolute inset-0 w-full h-full object-cover animate-crossfade-b"
              loading="lazy"
            />
          </div>
        ) : (
          <img src={imageSrc} alt={imageAlt} className="w-full h-auto block" loading="lazy" />
        )}
      </div>
    </div>
  );
}

export function ShowcaseSection() {
  return (
    <section id="showcase" className="py-24 px-6 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            See Feeduro in <span className="landing-gradient-text">action</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            A closer look at the features that make Feeduro different.
          </p>
        </div>

        <div className="space-y-28">
          {SHOWCASES.map((item) => (
            <ShowcaseCard key={item.tag} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
