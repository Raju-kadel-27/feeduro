type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
  accent: string;
};

// TODO: replace with real customer quotes before launching
const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "We used to have feature requests scattered across Slack, email, and support tickets. Now everything lands in one place and our team actually acts on it.",
    name: "Customer Name",
    role: "Role, Company",
    initials: "CN",
    accent: "rgb(59,130,246)",
  },
  {
    quote:
      "The changelog notifications are the best part. Users reply saying they can't believe we actually built what they asked for. It's changed how they feel about our product.",
    name: "Customer Name",
    role: "Role, Company",
    initials: "CN",
    accent: "rgb(139,92,246)",
  },
  {
    quote:
      "Setup took less than an hour. The widget is live in our app and feedback is already coming in from users we never heard from before.",
    name: "Customer Name",
    role: "Role, Company",
    initials: "CN",
    accent: "rgb(20,184,166)",
  },
];

export function TestimonialSection() {
  return (
    <section className="py-24 px-6 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            What teams are saying
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Built with real product teams
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map(({ quote, name, role, initials, accent }, i) => (
            <div
              key={i}
              className="flex flex-col gap-5 p-6 rounded-2xl border border-border bg-card/40"
            >
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
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
                  <p className="text-sm font-semibold leading-tight">{name}</p>
                  <p className="text-xs text-muted-foreground">{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
