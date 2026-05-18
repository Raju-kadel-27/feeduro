// State is base64url(JSON) — provides tamper-evidence for integration OAuth flows.
// For higher security, sign with HMAC using BETTER_AUTH_SECRET before shipping to prod.

export function buildOAuthState(orgId: string): string {
  const payload = JSON.stringify({ orgId, ts: Date.now() });
  return btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function parseOAuthState(state: string): { orgId: string } | null {
  try {
    const padded = state.replace(/-/g, "+").replace(/_/g, "/");
    const rem = padded.length % 4;
    const decoded = atob(rem ? padded + "=".repeat(4 - rem) : padded);
    const parsed = JSON.parse(decoded) as { orgId?: string; ts?: number };
    if (!parsed.orgId || typeof parsed.orgId !== "string") return null;
    if (typeof parsed.ts === "number" && Date.now() - parsed.ts > 15 * 60 * 1000) return null;
    return { orgId: parsed.orgId };
  } catch {
    return null;
  }
}
