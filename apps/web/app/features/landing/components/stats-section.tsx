const STATS = [
  { value: "10,000+", label: "Ideas submitted and tracked" },
  { value: "500+", label: "Product teams use it daily" },
  { value: "16+", label: "Tools connected, zero friction" },
];

export function StatsSection() {
  return (
    <section className="py-16">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <p className="text-4xl font-bold tracking-tight">{value}</p>
              <p className="text-sm text-muted-foreground mt-1.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
