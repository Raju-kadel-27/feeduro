import { renderChangelogNotificationEmail } from "@emails/changelog-notification";
import { sendEmail } from "@lib/mailer";
import { waitUntil } from "@middleware/cloudflare.server";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull } from "drizzle-orm";
import type { RouterContextProvider } from "react-router";
import type { Db } from "@/db";
import { changelogSubscribers, organization } from "@/db/schema";

export async function subscribeEmail(
  db: Db,
  organizationId: string,
  email: string,
): Promise<{ alreadySubscribed: boolean }> {
  const existing = await db.query.changelogSubscribers.findFirst({
    where: and(
      eq(changelogSubscribers.organizationId, organizationId),
      eq(changelogSubscribers.email, email),
    ),
    columns: { id: true, unsubscribedAt: true },
  });

  if (existing) {
    if (existing.unsubscribedAt) {
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

export async function unsubscribeByToken(db: Db, token: string): Promise<boolean> {
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

export async function getSubscriberCount(db: Db, organizationId: string): Promise<number> {
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
  db: Db,
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
  waitUntil(context, sendNotifications(db, opts));
}

async function sendNotifications(
  db: Db,
  opts: {
    organizationId: string;
    orgName: string;
    changelogTitle: string;
    excerpt: string;
    changelogUrl: string;
    baseUrl: string;
  },
) {
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, opts.organizationId),
    columns: { metadata: true },
  });

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
      const html = renderChangelogNotificationEmail({
        orgName: opts.orgName,
        changelogTitle: opts.changelogTitle,
        excerpt: opts.excerpt,
        changelogUrl: opts.changelogUrl,
        unsubscribeUrl,
      });
      await sendEmail({
        to: sub.email,
        subject: `${opts.orgName}: ${opts.changelogTitle}`,
        html,
      });
    }),
  );
}
