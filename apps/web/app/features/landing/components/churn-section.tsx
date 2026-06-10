export function ChurnSection() {
  return (
    <section className="py-24 px-6 border-y border-border bg-card/30">
      <div className="max-w-4xl mx-auto">

        {/* The fear */}
        <div className="text-center mb-16">
<h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-6">
            Your users are not leaving because{" "}
            your product is bad.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            They submitted a feature request. Nothing happened. They saw a competitor ship it.
            They quietly cancelled. No drama, no warning, no goodbye.
            They just stopped believing you were listening.
          </p>
        </div>

        {/* The math */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          <div className="p-6 rounded-2xl border border-border bg-background text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              What you spent to get them
            </p>
            <p className="text-4xl font-black text-foreground mb-1">$120</p>
            <p className="text-sm text-muted-foreground">average customer acquisition cost</p>
          </div>
          <div className="p-6 rounded-2xl border border-border bg-background text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              What you lost when they left
            </p>
            <p className="text-4xl font-black text-foreground mb-1">$600+</p>
            <p className="text-sm text-muted-foreground">per churned customer per year</p>
          </div>
          <div className="p-6 rounded-2xl border border-border bg-background text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              What Feeduro costs
            </p>
            <p className="text-4xl font-black text-primary mb-1">$20</p>
            <p className="text-sm text-muted-foreground">a month to make users feel heard</p>
          </div>
        </div>

        {/* The punchline */}
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xl sm:text-2xl font-bold leading-snug mb-4">
            If Feeduro stops 2 or 3 customers from cancelling this month,
            it has already paid for itself ten times over.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            But the real win is not the math. It is the kind of company you become when users
            know you are listening. That reputation compounds in ways no spreadsheet can capture.
          </p>
        </div>

      </div>
    </section>
  );
}
