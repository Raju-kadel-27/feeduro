const STEPS = [
  {
    n: "01",
    title: "User submits an idea",
    body: "An immediate confirmation. A page they can check. The sense that someone actually read it.",
  },
  {
    n: "02",
    title: "Others vote on it",
    body: "An instant nudge that their idea resonated. It brings them back. Social momentum with zero effort from your team.",
  },
  {
    n: "03",
    title: "Status moves forward",
    body: "Status changes trigger automatic notifications. Users find out before they have to ask.",
  },
  {
    n: "04",
    title: "Feature ships",
    body: "The single best retention email you can send. Sent automatically, to exactly the right people.",
  },
];

const OUTCOMES = [
  { value: "More return visits", label: "Teams report significantly more repeat sessions from users who track their ideas" },
  { value: "More submissions", label: "Public boards consistently generate more feedback than private ones" },
  { value: "Less churn", label: "Users who see their requests shipped are far less likely to cancel" },
];

export function EngagementSection() {
  return (
    <section className="py-24 px-6 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            The feedback loop
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Most tools stop at the inbox. We do not.
          </h2>
          <p className="text-muted-foreground text-lg">
            You collect an idea. Most tools stop there. Feeduro sends acknowledgments, progress
            updates, and launch notifications without you lifting a finger.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {STEPS.map(({ n, title, body }) => (
            <div key={n} className="relative p-6 rounded-2xl border border-border bg-card/40">
              <span className="text-5xl font-black text-muted-foreground/8 leading-none select-none absolute top-3 right-4">
                {n}
              </span>
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">{n}</p>
              <h3 className="font-bold text-base mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px rounded-2xl border border-border overflow-hidden bg-border">
          {OUTCOMES.map(({ value, label }) => (
            <div key={value} className="bg-background px-8 py-8 text-center">
              <p className="text-xl font-bold mb-1.5">{value}</p>
              <p className="text-sm text-muted-foreground leading-snug">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
