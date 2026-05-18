interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-5 space-y-1">
      <p className="text-xs font-medium text-[#71717a] uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-[#18181b] tabular-nums">{value}</p>
      {sub && <p className="text-xs text-[#a1a1aa]">{sub}</p>}
    </div>
  );
}
