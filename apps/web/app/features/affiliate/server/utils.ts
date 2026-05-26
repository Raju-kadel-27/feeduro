// Generates a cryptographically random, URL-safe referral code (8 chars).
// Uses the Web Crypto API available in both Node and Cloudflare Workers.
export function generateAffiliateCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 8)
    .toUpperCase();
}

// Produces a stable 64-char hex digest of the visitor's IP + UserAgent string.
// Used for click deduplication without storing raw PII.
export async function hashVisitor(raw: string): Promise<string> {
  const encoded = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Cents → formatted dollar string, e.g. 2000 → "$20.00"
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

// ─── Email self-referral detection ───────────────────────────────────────────

// Free/consumer email providers where a shared domain means nothing.
const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.fr",
  "hotmail.com", "hotmail.co.uk", "outlook.com", "live.com", "msn.com",
  "icloud.com", "me.com", "mac.com",
  "protonmail.com", "proton.me",
  "aol.com", "mail.com", "gmx.com", "gmx.net",
  "yandex.com", "yandex.ru",
]);

// Strips plus-addressing (alice+spam@gmail.com → alice@gmail.com) and
// removes dots from the local part of Gmail addresses, then lowercases.
// Mirrors Dub's normalizeEmail — catches the most common self-referral tricks.
export function normalizeEmail(email: string): string {
  const [local = "", domain = ""] = email.toLowerCase().split("@");
  const cleanLocal = domain === "gmail.com" || domain === "googlemail.com"
    ? local.split("+")[0]!.replace(/\./g, "")
    : local.split("+")[0]!;
  return `${cleanLocal}@${domain}`;
}

// Returns true when both emails are the same person or the same company,
// indicating a self-referral attempt that should be blocked.
export function isSameEmailIdentity(affiliateEmail: string, referredEmail: string): boolean {
  if (normalizeEmail(affiliateEmail) === normalizeEmail(referredEmail)) return true;

  const affiliateDomain = affiliateEmail.toLowerCase().split("@")[1] ?? "";
  const referredDomain = referredEmail.toLowerCase().split("@")[1] ?? "";

  // Domain match on non-generic domains = same company = self-referral
  if (
    affiliateDomain === referredDomain &&
    affiliateDomain !== "" &&
    !GENERIC_EMAIL_DOMAINS.has(affiliateDomain)
  ) {
    return true;
  }

  return false;
}

// ─── Plan price lookup ────────────────────────────────────────────────────────

// Plan price lookup (must stay in sync with billing page plan definitions)
const PLAN_PRICE_CENTS: Record<string, number> = {
  "starter-monthly": 1200,
  "starter-annual": 9600,   // $8/mo × 12
  "professional-monthly": 1800,
  "professional-annual": 16800, // $14/mo × 12
};

export function getPlanPriceCents(planSlug: string): number {
  return PLAN_PRICE_CENTS[planSlug] ?? 0;
}
