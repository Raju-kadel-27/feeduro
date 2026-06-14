import { requireOrganization } from "@features/auth/server/guards";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@features/internal/notifications/server/mutations";
import { getNotificationsForUser, getUnreadCount } from "@features/internal/notifications/server/queries";
import { data } from "react-router";
import { z } from "zod";

import type { Route } from "./+types/notifications";

const MarkReadSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("mark_read"), notificationId: z.string() }),
  z.object({ intent: z.literal("mark_all_read") }),
]);

export async function loader({ request }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrganization(request);
  const userId = session.user.id;

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  const limit = Number(url.searchParams.get("limit") ?? "50");

  const [notifs, unreadCount] = await Promise.all([
    getNotificationsForUser(userId, organizationId, { unreadOnly, limit }),
    getUnreadCount(userId, organizationId),
  ]);

  return data({ notifications: notifs, unreadCount });
}

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);
  const userId = session.user.id;

  const raw = await request.json();
  const parsed = MarkReadSchema.safeParse(raw);
  if (!parsed.success) return data({ error: "Invalid request" }, { status: 400 });

  if (parsed.data.intent === "mark_read") {
    await markNotificationRead(parsed.data.notificationId, userId);
    return data({ success: true });
  }

  if (parsed.data.intent === "mark_all_read") {
    await markAllNotificationsRead(userId, organizationId);
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
