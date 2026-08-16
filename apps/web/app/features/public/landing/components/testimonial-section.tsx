type Testimonial = {
  quote: string;
  name: string;
  role: string;
  company: string;
  initials: string;
  accent: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "We had feature requests scattered across Slack, email, and intercom. Feeduro brought everything into one place and within a week our PM had a real priority list. Game changer.",
    name: "Marcus Webb",
    role: "Head of Product",
    company: "Launchpath",
    initials: "MW",
    accent: "rgb(59,130,246)",
  },
  {
    quote:
      "The changelog notifications are honestly the best feature. Users reply saying they can't believe we actually shipped what they asked for. It's completely changed how they feel about us.",
    name: "Priya Nair",
    role: "Founder & CEO",
    company: "Stackform",
    initials: "PN",
    accent: "rgb(139,92,246)",
  },
  {
    quote:
      "Setup took under an hour. The widget went live in our app and feedback started coming in from users we'd never heard from before. We caught two bugs on day one.",
    name: "Tom Eriksen",
    role: "CTO",
    company: "Veltro",
    initials: "TE",
    accent: "rgb(20,184,166)",
  },
  {
    quote:
      "The Linear sync alone is worth it. Feedback goes from user → Feeduro → Linear issue automatically. My engineers see the context behind every ticket now.",
    name: "Danielle Cho",
    role: "Engineering Manager",
    company: "Refinery Labs",
    initials: "DC",
    accent: "rgb(245,158,11)",
  },
  {
    quote:
      "We were paying $200/month for a feedback tool that did half of this. Feeduro has the board, roadmap, and changelog all in one — and our customers actually use the public portal.",
    name: "Arjun Mehta",
    role: "Product Manager",
    company: "Celeris",
    initials: "AM",
    accent: "rgb(239,68,68)",
  },
  {
    quote:
      "SSO setup took 15 minutes with Okta. The white-label portal looks like it's fully part of our product. Customers don't even realize it's a third-party tool.",
    name: "Sophie Laurent",
    role: "VP of Engineering",
    company: "Orbio",
    initials: "SL",
    accent: "rgb(99,102,241)",
  },
];

export function TestimonialSection() {
  return (
    <section className="py-24 px-6 bg-muted/40">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Trusted by product teams
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Teams that ship with Feeduro
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
            From early-stage startups to growing SaaS — here's what they're saying.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TESTIMONIALS.map(({ quote, name, role, company, initials, accent }) => (
            <div
              key={name}
              className="flex flex-col gap-5 p-6 rounded-2xl border border-border bg-background"
            >
              <p className="text-base text-foreground/75 leading-relaxed flex-1">
                &ldquo;{quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: accent }}
                >
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight text-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {role} · {company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
