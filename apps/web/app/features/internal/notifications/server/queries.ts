import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import { notifications, user } from "@/db/schema";
import { type Notification, NotificationMetadataSchema } from "../schemas/notification";

export async function getNotificationsForUser(
  db: Db,
  userId: string,
  organizationId: string,
  options?: { unreadOnly?: boolean; limit?: number },
): Promise<Notification[]> {
  const limit = options?.limit ?? 50;

  const conditions = [
    eq(notifications.userId, userId),
    eq(notifications.organizationId, organizationId),
  ];
  if (options?.unreadOnly) conditions.push(isNull(notifications.readAt));

  const rows = await db
    .select({
      id: notifications.id,
      organizationId: notifications.organizationId,
      userId: notifications.userId,
      type: notifications.type,
      postId: notifications.postId,
      actorId: notifications.actorId,
      metadata: notifications.metadata,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
      actorName: user.name,
      actorImage: user.image,
    })
    .from(notifications)
    .leftJoin(user, eq(notifications.actorId, user.id))
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return rows.map((r) => {
    const parsed = r.metadata ? NotificationMetadataSchema.safeParse(JSON.parse(r.metadata)) : null;
    return {
      ...r,
      metadata: parsed?.success ? parsed.data : null,
      readAt: r.readAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

export async function getUnreadCount(db: Db, userId: string, organizationId: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId),
        isNull(notifications.readAt),
      ),
    );
  return rows.length;
}
