import { ChangelogNotificationEmail } from "@emails/changelog-notification";
import { sendEmail } from "@lib/mailer";
import { waitUntil } from "@middleware/cloudflare.server";
import { render } from "@react-email/render";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull } from "drizzle-orm";
import type { RouterContextProvider } from "react-router";
import { getDb } from "@/db";
import { changelogSubscribers, organization } from "@/db/schema";

export async function subscribeEmail(
  organizationId: string,
  email: string,
): Promise<{ alreadySubscribed: boolean }> {
  const db = getDb();

  const existing = await db.query.changelogSubscribers.findFirst({
    where: and(
      eq(changelogSubscribers.organizationId, organizationId),
      eq(changelogSubscribers.email, email),
    ),
    columns: { id: true, unsubscribedAt: true },
  });

  if (existing) {
    if (existing.unsubscribedAt) {
      // Re-subscribe: clear unsubscribedAt and issue a fresh token
      await db
        .update(changelogSubscribers)
        .set({ unsubscribedAt: null, unsubscribeToken: createId() })
        .where(eq(changelogSubscribers.id, existing.id));
      return { alreadySubscribed: false };
    }
    return { alreadySubscribed: true };
  }

  await db.insert(changelogSubscribers).values({
    organizationId,
    email,
    unsubscribeToken: createId(),
  });

  return { alreadySubscribed: false };
}

export async function unsubscribeByToken(token: string): Promise<boolean> {
  const db = getDb();

  const subscriber = await db.query.changelogSubscribers.findFirst({
    where: eq(changelogSubscribers.unsubscribeToken, token),
    columns: { id: true, unsubscribedAt: true },
  });

  if (!subscriber || subscriber.unsubscribedAt) return false;

  await db
    .update(changelogSubscribers)
    .set({ unsubscribedAt: new Date() })
    .where(eq(changelogSubscribers.id, subscriber.id));

  return true;
}

export async function getSubscriberCount(organizationId: string): Promise<number> {
  const db = getDb();
  const rows = await db.query.changelogSubscribers.findMany({
    where: and(
      eq(changelogSubscribers.organizationId, organizationId),
      isNull(changelogSubscribers.unsubscribedAt),
    ),
    columns: { id: true },
  });
  return rows.length;
}

export function notifyChangelogSubscribers(
  context: Readonly<RouterContextProvider>,
  opts: {
    organizationId: string;
    orgName: string;
    changelogTitle: string;
    excerpt: string;
    changelogUrl: string;
    baseUrl: string;
  },
) {
  waitUntil(context, sendNotifications(opts));
}

async function sendNotifications(opts: {
  organizationId: string;
  orgName: string;
  changelogTitle: string;
  excerpt: string;
  changelogUrl: string;
  baseUrl: string;
}) {
  const db = getDb();

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, opts.organizationId),
    columns: { metadata: true },
  });

  // Check subscriptions are enabled
  let subscriptionsEnabled = false;
  try {
    const meta = JSON.parse(org?.metadata ?? "{}") as Record<string, unknown>;
    const settings = meta.changelogSettings as Record<string, unknown> | undefined;
    subscriptionsEnabled = settings?.emailSubscriptionsEnabled === true;
  } catch {}

  if (!subscriptionsEnabled) return;

  const subscribers = await db.query.changelogSubscribers.findMany({
    where: and(
      eq(changelogSubscribers.organizationId, opts.organizationId),
      isNull(changelogSubscribers.unsubscribedAt),
    ),
    columns: { email: true, unsubscribeToken: true },
  });

  if (subscribers.length === 0) return;

  await Promise.all(
    subscribers.map(async (sub) => {
      const unsubscribeUrl = `${opts.baseUrl}/api/changelog-unsubscribe?token=${sub.unsubscribeToken}`;
      const html = await render(
        ChangelogNotificationEmail({
          orgName: opts.orgName,
          changelogTitle: opts.changelogTitle,
          excerpt: opts.excerpt,
          changelogUrl: opts.changelogUrl,
          unsubscribeUrl,
        }),
      );
      await sendEmail({
        to: sub.email,
        subject: `${opts.orgName}: ${opts.changelogTitle}`,
        html,
      });
    }),
  );
}
