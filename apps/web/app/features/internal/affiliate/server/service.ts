import { sendEmail } from "@lib/mailer";
import { and, desc, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  affiliateClicks,
  affiliateConversions,
  affiliatePayouts,
  affiliates,
  member,
  user,
} from "@/db/schema";
import { checkFraud } from "./fraud";
import { generateAffiliateCode, getPlanPriceCents, hashVisitor, isSameEmailIdentity } from "./utils";

async function notifyAdminFraudFlag(opts: {
  conversionId: string;
  type: string;
  reasons: string[];
  referredEmail: string;
  affiliateCode: string;
}) {
  const adminEmails = (process.env.AFFILIATE_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (adminEmails.length === 0) return;
  const reasonList = opts.reasons.map((r) => `<li>${r.replace(/_/g, " ")}</li>`).join("");
  await sendEmail({
    to: adminEmails,
    subject: `[Feeduro Affiliate] Conversion flagged for review`,
    html: `
      <p>A <strong>${opts.type}</strong> conversion was automatically flagged and blocked from payout.</p>
      <ul>
        <li><strong>Conversion ID:</strong> ${opts.conversionId}</li>
        <li><strong>Affiliate code:</strong> ${opts.affiliateCode}</li>
        <li><strong>Referred email:</strong> ${opts.referredEmail}</li>
        <li><strong>Flag reasons:</strong><ul>${reasonList}</ul></li>
      </ul>
      <p><a href="${process.env.BASE_URL}/affiliate-admin?tab=flagged">Review in admin dashboard →</a></p>
    `,
  }).catch(() => {
    // Non-fatal — fraud is already recorded in the DB; email is best-effort
  });
}

// Commissions stay "pending" for this many days before becoming payout-eligible.
// Mirrors Dub's holdingPeriodDays — gives time to detect/clawback fraud before money moves.
const HOLDING_PERIOD_DAYS = 30;

// ─── Join ────────────────────────────────────────────────────────────────────

export async function joinAffiliateProgram(userId: string): Promise<{ code: string }> {
  const db = getDb();
  const existing = await db.query.affiliates.findFirst({
    where: eq(affiliates.userId, userId),
    columns: { code: true },
  });
  if (existing) return { code: existing.code };

  const code = generateAffiliateCode();
  await db.insert(affiliates).values({ userId, code });
  return { code };
}

// ─── Click tracking ───────────────────────────────────────────────────────────

export async function recordClick(
  code: string,
  request: Request,
): Promise<{ found: boolean }> {
  const db = getDb();
  const affiliate = await db.query.affiliates.findFirst({
    where: and(eq(affiliates.code, code), eq(affiliates.status, "active")),
    columns: { id: true },
  });
  if (!affiliate) return { found: false };

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for") ??
    "";
  const ua = request.headers.get("user-agent") ?? "";
  const referrer = request.headers.get("referer") ?? "";
  const visitorToken = await hashVisitor(ip + ua);

  // DB-level dedup: skip if this visitor already clicked this affiliate's link within 1 hour.
  // The browser cookie handles the common case; this catches cookie-less bots and curl requests.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentClick = await db.query.affiliateClicks.findFirst({
    where: and(
      eq(affiliateClicks.affiliateId, affiliate.id),
      eq(affiliateClicks.visitorToken, visitorToken),
      gt(affiliateClicks.createdAt, oneHourAgo),
    ),
    columns: { id: true },
  });
  if (recentClick) return { found: true };

  await db.insert(affiliateClicks).values({
    affiliateId: affiliate.id,
    visitorToken,
    ipAddress: ip.slice(0, 45),
    userAgent: ua.slice(0, 500),
    referrer: referrer.slice(0, 2048),
  });

  await db
    .update(affiliates)
    .set({ totalClicks: sql`total_clicks + 1` })
    .where(eq(affiliates.id, affiliate.id));

  return { found: true };
}

// ─── Signup conversion ────────────────────────────────────────────────────────

export async function recordSignupConversion(
  referredUserId: string,
  affiliateCode: string,
): Promise<void> {
  const db = getDb();
  const affiliate = await db.query.affiliates.findFirst({
    where: eq(affiliates.code, affiliateCode),
    columns: { id: true, userId: true },
  });
  if (!affiliate) return;
  if (affiliate.userId === referredUserId) return;

  // Fetch both users' emails in parallel to check for domain-level self-referral.
  // e.g. affiliate=john@acme.com, referred=billing@acme.com → same company → block.
  const [affiliateUser, referredUser] = await Promise.all([
    db.query.user.findFirst({ where: eq(user.id, affiliate.userId), columns: { email: true } }),
    db.query.user.findFirst({ where: eq(user.id, referredUserId), columns: { email: true } }),
  ]);
  if (
    affiliateUser?.email &&
    referredUser?.email &&
    isSameEmailIdentity(affiliateUser.email, referredUser.email)
  ) {
    return;
  }

  const fraud = await checkFraud({
    referredEmail: referredUser?.email ?? "",
    referredUserId,
    affiliateId: affiliate.id,
  });

  const inserted = await db
    .insert(affiliateConversions)
    .values({
      affiliateId: affiliate.id,
      referredUserId,
      type: "signup",
      status: fraud.flagged ? "flagged" : "approved",
      flaggedForReview: fraud.flagged,
      flagReasons: fraud.flagged ? JSON.stringify(fraud.reasons) : null,
    })
    .onConflictDoNothing()
    .returning({ id: affiliateConversions.id });

  if (inserted.length > 0) {
    await db
      .update(affiliates)
      .set({ totalConversions: sql`total_conversions + 1` })
      .where(eq(affiliates.id, affiliate.id));

    if (fraud.flagged) {
      void notifyAdminFraudFlag({
        conversionId: inserted[0]!.id,
        type: "signup",
        reasons: fraud.reasons,
        referredEmail: referredUser?.email ?? "",
        affiliateCode,
      });
    }
  }
}

// ─── Subscription conversion ──────────────────────────────────────────────────

export async function recordSubscriptionConversion({
  organizationId,
  dodoSubscriptionId,
  planSlug,
  affiliateCode,
}: {
  organizationId: string;
  dodoSubscriptionId: string;
  planSlug: string;
  affiliateCode: string;
}): Promise<void> {
  const db = getDb();

  const affiliate = await db.query.affiliates.findFirst({
    where: eq(affiliates.code, affiliateCode),
    columns: { id: true, userId: true, commissionPercent: true },
  });
  if (!affiliate) return;

  const ownerMember = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.role, "owner")),
    columns: { userId: true },
  });
  if (ownerMember?.userId === affiliate.userId) return;

  // Fetch both emails in one round-trip for the self-referral check.
  // We reuse ownerEmail below for fraud detection so we don't query twice.
  let ownerEmail: string | null = null;
  if (ownerMember?.userId) {
    const [affiliateUser, ownerUser] = await Promise.all([
      db.query.user.findFirst({ where: eq(user.id, affiliate.userId), columns: { email: true } }),
      db.query.user.findFirst({ where: eq(user.id, ownerMember.userId), columns: { email: true } }),
    ]);
    ownerEmail = ownerUser?.email ?? null;
    if (
      affiliateUser?.email &&
      ownerEmail &&
      isSameEmailIdentity(affiliateUser.email, ownerEmail)
    ) {
      return;
    }
  }

  const amountCents = getPlanPriceCents(planSlug);
  const commissionCents = Math.floor((amountCents * affiliate.commissionPercent) / 100);

  const fraud =
    ownerMember?.userId && ownerEmail
      ? await checkFraud({
          referredEmail: ownerEmail,
          referredUserId: ownerMember.userId,
          affiliateId: affiliate.id,
        })
      : { flagged: false, reasons: [] as string[] };

  const inserted = await db
    .insert(affiliateConversions)
    .values({
      affiliateId: affiliate.id,
      referredOrgId: organizationId,
      referredUserId: ownerMember?.userId ?? null,
      type: "subscription",
      // Flagged conversions are blocked until an admin reviews them.
      // Normal conversions are "pending" — held for HOLDING_PERIOD_DAYS before payout.
      status: fraud.flagged ? "flagged" : "pending",
      amountCents,
      commissionCents,
      dodoSubscriptionId,
      flaggedForReview: fraud.flagged,
      flagReasons: fraud.flagged ? JSON.stringify(fraud.reasons) : null,
    })
    .onConflictDoNothing()
    .returning({ id: affiliateConversions.id });

  if (inserted.length > 0) {
    await db
      .update(affiliates)
      .set({
        totalConversions: sql`total_conversions + 1`,
        // Only credit earnings when the conversion passes fraud checks.
        // Flagged conversions are credited after an admin approves them.
        ...(fraud.flagged ? {} : { totalEarningsCents: sql`total_earnings_cents + ${commissionCents}` }),
      })
      .where(eq(affiliates.id, affiliate.id));

    if (fraud.flagged) {
      void notifyAdminFraudFlag({
        conversionId: inserted[0]!.id,
        type: "subscription",
        reasons: fraud.reasons,
        referredEmail: ownerEmail ?? "",
        affiliateCode,
      });
    }
  }
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export type AffiliateStats = {
  id: string;
  code: string;
  status: string;
  commissionPercent: number;
  commissionDurationMonths: number;
  totalClicks: number;
  totalConversions: number;
  totalEarningsCents: number;
  payoutEmail: string | null;
  createdAt: Date;
  recentConversions: Array<{
    id: string;
    type: string;
    status: string;
    amountCents: number;
    commissionCents: number;
    createdAt: Date;
  }>;
  recentPayouts: Array<{
    id: string;
    amountCents: number;
    status: string;
    paidAt: Date | null;
    createdAt: Date;
  }>;
  pendingPayoutCents: number;
};

export async function getAffiliateStats(userId: string): Promise<AffiliateStats | null> {
  const db = getDb();
  const affiliate = await db.query.affiliates.findFirst({
    where: eq(affiliates.userId, userId),
  });
  if (!affiliate) return null;

  // FIX: Only approved conversions older than HOLDING_PERIOD_DAYS are payout-eligible.
  const holdingCutoff = new Date(Date.now() - HOLDING_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  const [recentConversions, recentPayouts, pendingRow] = await Promise.all([
    db.query.affiliateConversions.findMany({
      where: eq(affiliateConversions.affiliateId, affiliate.id),
      orderBy: [desc(affiliateConversions.createdAt)],
      limit: 20,
      columns: {
        id: true,
        type: true,
        status: true,
        amountCents: true,
        commissionCents: true,
        createdAt: true,
      },
    }),
    db.query.affiliatePayouts.findMany({
      where: eq(affiliatePayouts.affiliateId, affiliate.id),
      orderBy: [desc(affiliatePayouts.createdAt)],
      limit: 10,
      columns: { id: true, amountCents: true, status: true, paidAt: true, createdAt: true },
    }),
    db
      .select({ total: sql<number>`coalesce(sum(commission_cents), 0)` })
      .from(affiliateConversions)
      .where(
        and(
          eq(affiliateConversions.affiliateId, affiliate.id),
          eq(affiliateConversions.status, "approved"),
          isNull(affiliateConversions.payoutId),
          // Only include commissions past the holding period
          lt(affiliateConversions.createdAt, holdingCutoff),
        ),
      ),
  ]);

  return {
    ...affiliate,
    recentConversions,
    recentPayouts,
    pendingPayoutCents: Number(pendingRow[0]?.total ?? 0),
  };
}

// ─── Payout request ───────────────────────────────────────────────────────────

export async function requestPayout(
  userId: string,
  payoutDetails: string,
): Promise<{ error?: string }> {
  const db = getDb();
  const affiliate = await db.query.affiliates.findFirst({
    where: eq(affiliates.userId, userId),
    columns: { id: true },
  });
  if (!affiliate) return { error: "Not an affiliate" };

  const holdingCutoff = new Date(Date.now() - HOLDING_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  // FIX: Run the entire payout creation inside a DB transaction to eliminate
  // the race condition between summing eligible commissions and inserting the
  // payout row. Without this, two concurrent payout requests could both see
  // the same unpaid commissions and create duplicate payouts.
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ total: sql<number>`coalesce(sum(commission_cents), 0)` })
      .from(affiliateConversions)
      .where(
        and(
          eq(affiliateConversions.affiliateId, affiliate.id),
          eq(affiliateConversions.status, "approved"),
          isNull(affiliateConversions.payoutId),
          lt(affiliateConversions.createdAt, holdingCutoff),
        ),
      );

    const amountCents = Number(row?.total ?? 0);
    if (amountCents < 1000) return { error: "Minimum payout is $10.00" };

    const [payout] = await tx
      .insert(affiliatePayouts)
      .values({
        affiliateId: affiliate.id,
        amountCents,
        paymentDetails: payoutDetails,
      })
      .returning({ id: affiliatePayouts.id });

    if (!payout) return { error: "Failed to create payout request" };

    await tx
      .update(affiliateConversions)
      .set({ status: "paid", payoutId: payout.id })
      .where(
        and(
          eq(affiliateConversions.affiliateId, affiliate.id),
          eq(affiliateConversions.status, "approved"),
          isNull(affiliateConversions.payoutId),
          lt(affiliateConversions.createdAt, holdingCutoff),
        ),
      );

    await tx
      .update(affiliates)
      .set({ payoutEmail: payoutDetails })
      .where(eq(affiliates.id, affiliate.id));

    return {};
  });
}

// ─── Admin: list all affiliates ───────────────────────────────────────────────

export async function adminListAffiliates(limit = 200) {
  const db = getDb();
  return db.query.affiliates.findMany({
    orderBy: [desc(affiliates.createdAt)],
    limit,
    columns: {
      id: true,
      code: true,
      status: true,
      commissionPercent: true,
      totalClicks: true,
      totalConversions: true,
      totalEarningsCents: true,
      payoutEmail: true,
      createdAt: true,
    },
    with: {
      user: { columns: { email: true, name: true } },
    },
  });
}

// ─── Admin: list flagged conversions ─────────────────────────────────────────

export async function adminListFlaggedConversions(limit = 200) {
  const db = getDb();
  return db.query.affiliateConversions.findMany({
    where: eq(affiliateConversions.flaggedForReview, true),
    orderBy: [desc(affiliateConversions.createdAt)],
    limit,
    columns: {
      id: true,
      type: true,
      status: true,
      amountCents: true,
      commissionCents: true,
      flagReasons: true,
      flaggedForReview: true,
      reviewedAt: true,
      createdAt: true,
    },
    with: {
      affiliate: {
        columns: { code: true },
        with: { user: { columns: { email: true, name: true } } },
      },
      referredUser: { columns: { email: true, name: true } },
    },
  });
}

// ─── Admin: approve a flagged conversion ─────────────────────────────────────

export async function adminApproveConversion(
  conversionId: string,
  adminUserId: string,
): Promise<{ error?: string }> {
  const db = getDb();
  const conversion = await db.query.affiliateConversions.findFirst({
    where: eq(affiliateConversions.id, conversionId),
    columns: { id: true, affiliateId: true, status: true, commissionCents: true, flaggedForReview: true },
  });
  if (!conversion) return { error: "Conversion not found" };
  if (conversion.status !== "flagged") return { error: "Only flagged conversions can be approved" };

  await db.transaction(async (tx) => {
    await tx
      .update(affiliateConversions)
      .set({
        status: "approved",
        flaggedForReview: false,
        reviewedAt: new Date(),
        reviewedByUserId: adminUserId,
      })
      .where(eq(affiliateConversions.id, conversionId));

    // Credit the commission that was withheld when the conversion was flagged.
    if (conversion.commissionCents > 0) {
      await tx
        .update(affiliates)
        .set({ totalEarningsCents: sql`total_earnings_cents + ${conversion.commissionCents}` })
        .where(eq(affiliates.id, conversion.affiliateId));
    }
  });

  return {};
}

// ─── Admin: reject a flagged conversion ──────────────────────────────────────

export async function adminRejectConversion(
  conversionId: string,
  adminUserId: string,
): Promise<{ error?: string }> {
  const db = getDb();
  const conversion = await db.query.affiliateConversions.findFirst({
    where: eq(affiliateConversions.id, conversionId),
    columns: { id: true, affiliateId: true, status: true, commissionCents: true },
  });
  if (!conversion) return { error: "Conversion not found" };
  if (!["flagged", "pending", "approved"].includes(conversion.status)) {
    return { error: "Cannot reject a conversion in this state" };
  }

  // Earnings were credited for "pending" and "approved" conversions but not "flagged".
  const earningsWereCredited = conversion.status !== "flagged";

  await db.transaction(async (tx) => {
    await tx
      .update(affiliateConversions)
      .set({
        status: "rejected",
        flaggedForReview: false,
        reviewedAt: new Date(),
        reviewedByUserId: adminUserId,
      })
      .where(eq(affiliateConversions.id, conversionId));

    await tx
      .update(affiliates)
      .set({
        totalConversions: sql`GREATEST(0, total_conversions - 1)`,
        ...(earningsWereCredited && conversion.commissionCents > 0
          ? { totalEarningsCents: sql`GREATEST(0, total_earnings_cents - ${conversion.commissionCents})` }
          : {}),
      })
      .where(eq(affiliates.id, conversion.affiliateId));
  });

  return {};
}

// ─── Admin: clawback a paid conversion ───────────────────────────────────────

export async function adminClawbackConversion(
  conversionId: string,
  adminUserId: string,
): Promise<{ error?: string }> {
  const db = getDb();
  const conversion = await db.query.affiliateConversions.findFirst({
    where: eq(affiliateConversions.id, conversionId),
    columns: { id: true, affiliateId: true, status: true, commissionCents: true },
  });
  if (!conversion) return { error: "Conversion not found" };
  if (conversion.status !== "paid") return { error: "Only paid conversions can be clawed back" };

  await db.transaction(async (tx) => {
    await tx
      .update(affiliateConversions)
      .set({
        status: "rejected",
        reviewedAt: new Date(),
        reviewedByUserId: adminUserId,
      })
      .where(eq(affiliateConversions.id, conversionId));

    await tx
      .update(affiliates)
      .set({
        totalConversions: sql`GREATEST(0, total_conversions - 1)`,
        totalEarningsCents: sql`GREATEST(0, total_earnings_cents - ${conversion.commissionCents})`,
      })
      .where(eq(affiliates.id, conversion.affiliateId));
  });

  return {};
}

// ─── Admin: clawback all paid conversions in a payout ────────────────────────
// Used when an admin reverses an entire payout externally (e.g. bank transfer reversal).
// Marks every conversion in the payout as "rejected" and rolls back the
// affiliate's totals atomically. Guards with GREATEST(0,...) so counters
// never go negative even if called multiple times due to a bug.

export async function adminClawbackPayout(
  payoutId: string,
  adminUserId: string,
): Promise<{ error?: string }> {
  const db = getDb();

  const payout = await db.query.affiliatePayouts.findFirst({
    where: eq(affiliatePayouts.id, payoutId),
    columns: { id: true, status: true, affiliateId: true, amountCents: true },
  });
  if (!payout) return { error: "Payout not found" };
  if (payout.status !== "paid") return { error: "Only paid payouts can be clawed back" };

  const conversionRows = await db.query.affiliateConversions.findMany({
    where: eq(affiliateConversions.payoutId, payoutId),
    columns: { id: true, commissionCents: true },
  });
  if (conversionRows.length === 0) return { error: "No conversions found for this payout" };

  const totalCommission = conversionRows.reduce((sum, c) => sum + c.commissionCents, 0);
  const ids = conversionRows.map((c) => c.id);

  await db.transaction(async (tx) => {
    await tx
      .update(affiliateConversions)
      .set({ status: "rejected", reviewedAt: new Date(), reviewedByUserId: adminUserId })
      .where(inArray(affiliateConversions.id, ids));

    await tx
      .update(affiliatePayouts)
      .set({ status: "failed" })
      .where(eq(affiliatePayouts.id, payoutId));

    await tx
      .update(affiliates)
      .set({
        totalConversions: sql`GREATEST(0, total_conversions - ${conversionRows.length})`,
        totalEarningsCents: sql`GREATEST(0, total_earnings_cents - ${totalCommission})`,
      })
      .where(eq(affiliates.id, payout.affiliateId));
  });

  return {};
}

// ─── Admin: suspend / activate affiliate ─────────────────────────────────────

export async function adminSetAffiliateStatus(
  affiliateId: string,
  status: "active" | "suspended",
): Promise<{ error?: string }> {
  const db = getDb();
  const existing = await db.query.affiliates.findFirst({
    where: eq(affiliates.id, affiliateId),
    columns: { id: true },
  });
  if (!existing) return { error: "Affiliate not found" };

  await db.update(affiliates).set({ status }).where(eq(affiliates.id, affiliateId));
  return {};
}

// ─── Admin: mark payout as paid ──────────────────────────────────────────────

export async function adminMarkPayoutPaid(
  payoutId: string,
): Promise<{ error?: string }> {
  const db = getDb();
  const payout = await db.query.affiliatePayouts.findFirst({
    where: eq(affiliatePayouts.id, payoutId),
    columns: { id: true, status: true },
  });
  if (!payout) return { error: "Payout not found" };
  if (payout.status === "paid") return { error: "Already marked as paid" };

  await db
    .update(affiliatePayouts)
    .set({ status: "paid", paidAt: new Date() })
    .where(eq(affiliatePayouts.id, payoutId));

  return {};
}

// ─── Admin: list all pending payouts ─────────────────────────────────────────

export async function adminListPayouts(limit = 200) {
  const db = getDb();
  return db.query.affiliatePayouts.findMany({
    orderBy: [desc(affiliatePayouts.createdAt)],
    limit,
    columns: {
      id: true,
      amountCents: true,
      status: true,
      paymentMethod: true,
      paymentDetails: true,
      paidAt: true,
      createdAt: true,
    },
    with: {
      affiliate: {
        columns: { code: true },
        with: { user: { columns: { email: true, name: true } } },
      },
    },
  });
}
