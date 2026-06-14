import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import type { NotificationMetadata, NotificationType } from "../schemas/notification";

export interface NewNotification {
  organizationId: string;
  userId: string;
  type: NotificationType;
  postId?: string | null;
  actorId?: string | null;
  metadata?: NotificationMetadata | null;
}

export async function insertNotification(data: NewNotification): Promise<void> {
  const db = getDb();
  await db.insert(notifications).values({
    organizationId: data.organizationId,
    userId: data.userId,
    type: data.type,
    postId: data.postId ?? null,
    actorId: data.actorId ?? null,
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
  });
}

export async function insertNotifications(data: NewNotification[]): Promise<void> {
  if (data.length === 0) return;
  const db = getDb();
  await db.insert(notifications).values(
    data.map((d) => ({
      organizationId: d.organizationId,
      userId: d.userId,
      type: d.type,
      postId: d.postId ?? null,
      actorId: d.actorId ?? null,
      metadata: d.metadata ? JSON.stringify(d.metadata) : null,
    })),
  );
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  const db = getDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(
  userId: string,
  organizationId: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId),
        isNull(notifications.readAt),
      ),
    );
}
