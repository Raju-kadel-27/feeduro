// Production connects directly to Neon's cloud endpoints, where the neon driver
// defaults are already correct (secure WebSocket for transactions, HTTPS /sql
// for queries). Nothing to override — this exists to make the prod path explicit
// and to give environment-specific driver config a home if it's ever needed.
export function configureProdDriver(): void {
  // no overrides needed
}
