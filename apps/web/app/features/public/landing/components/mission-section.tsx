export function MissionSection() {
  return (
    <section className="py-16 px-6 border-t border-border">
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Why we built this
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
          Every feedback board shows vote counts. None tell you what those votes are worth.
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          The top-voted request might come from a $50/month free user. The fourth-place request
          might be the only thing standing between you and your largest account churning next quarter.
          We built Feeduro because vote counts alone are noise — and product teams deserve the signal.
        </p>
      </div>
    </section>
  );
}
