// "john.doe@company.com" → "John Doe", "raju@powr.io" → "Raju".
// Used when a user has no explicit display name (e.g. email-only signup).
export function toDisplayName(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
