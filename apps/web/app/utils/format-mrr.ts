// Formats a whole-dollar MRR amount for compact display (e.g. 1500 → "$1.5K").
export function formatMrr(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount}`;
}
