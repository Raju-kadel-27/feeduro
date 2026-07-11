export function ChurnSection() {
  return (
    <section className="py-24 px-6 bg-black text-white">
      <div className="max-w-4xl mx-auto">

        {/* The fear */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-6 text-white/80">
            Your users are not leaving because{" "}
            your product is bad.
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            They submitted a feature request. Nothing happened. They saw a competitor ship it.
            They quietly cancelled. No drama, no warning, no goodbye.
            They just stopped believing you were listening.
          </p>
        </div>

        {/* The math */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          <div className="p-6 rounded-2xl border border-white/10 bg-white/5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">
              What you spent to get them
            </p>
            <p className="text-4xl font-black text-white/80 mb-1">$120</p>
            <p className="text-sm text-white/50">average customer acquisition cost</p>
          </div>
          <div className="p-6 rounded-2xl border border-white/10 bg-white/5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">
              What you lost when they left
            </p>
            <p className="text-4xl font-black text-white/80 mb-1">$600+</p>
            <p className="text-sm text-white/50">per churned customer per year</p>
          </div>
          <div className="p-6 rounded-2xl border border-white/10 bg-white/5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">
              What Feeduro costs
            </p>
            <p className="text-4xl font-black text-white/80 mb-1">$20</p>
            <p className="text-sm text-white/50">a month to make users feel heard</p>
          </div>
        </div>

      </div>
    </section>
  );
}
