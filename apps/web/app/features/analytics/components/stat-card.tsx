interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground/70">{sub}</p>}
    </div>
  );
}
