import { and, count, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { affiliateConversions, user } from "@/db/schema";
import { DISPOSABLE_DOMAINS } from "./disposable-domains";

// Number of new conversions an affiliate can generate in 24 hours before being flagged.
// 10 is aggressive enough to catch coordinated fraud while not penalizing legitimate viral sharing.
const VELOCITY_MAX_CONVERSIONS = 10;
const VELOCITY_WINDOW_MS = 24 * 60 * 60 * 1000;

// Accounts created less than 5 minutes before conversion are likely throwaway/bot accounts.
const RAPID_SIGNUP_WINDOW_MS = 5 * 60 * 1000;

export interface FraudCheckResult {
  flagged: boolean;
  reasons: string[];
}

export async function checkFraud({
  referredEmail,
  referredUserId,
  affiliateId,
}: {
  referredEmail: string;
  referredUserId: string;
  affiliateId: string;
}): Promise<FraudCheckResult> {
  const reasons: string[] = [];

  // Rule 1: Disposable email domain (synchronous — no DB needed)
  const domain = referredEmail.toLowerCase().split("@")[1] ?? "";
  if (DISPOSABLE_DOMAINS.has(domain)) {
    reasons.push("disposable_email");
  }

  const db = getDb();
  const velocityCutoff = new Date(Date.now() - VELOCITY_WINDOW_MS);

  const [velocityRows, referredUser] = await Promise.all([
    db
      .select({ cnt: count() })
      .from(affiliateConversions)
      .where(
        and(
          eq(affiliateConversions.affiliateId, affiliateId),
          gt(affiliateConversions.createdAt, velocityCutoff),
        ),
      ),
    db.query.user.findFirst({
      where: eq(user.id, referredUserId),
      columns: { createdAt: true },
    }),
  ]);

  // Rule 2: Velocity — too many conversions from one affiliate in 24 h
  const recentCount = Number(velocityRows[0]?.cnt ?? 0);
  if (recentCount >= VELOCITY_MAX_CONVERSIONS) {
    reasons.push("velocity_exceeded");
  }

  // Rule 3: Rapid signup — account created within 5 minutes of this conversion
  if (referredUser?.createdAt) {
    const accountAgeMs = Date.now() - referredUser.createdAt.getTime();
    if (accountAgeMs < RAPID_SIGNUP_WINDOW_MS) {
      reasons.push("rapid_signup");
    }
  }

  return { flagged: reasons.length > 0, reasons };
}
