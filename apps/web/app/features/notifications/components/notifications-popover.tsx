import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import type { Notification } from "../schemas/notification";
import { NotificationItem } from "./notification-item";

interface Props {
  notifications: Notification[];
  unreadCount: number;
  orgSlug: string;
  onClose: () => void;
  onMarkAllRead: () => void;
}

export function NotificationsPopover({
  notifications,
  unreadCount,
  orgSlug,
  onClose,
  onMarkAllRead,
}: Props) {
  const qc = useQueryClient();

  const { mutate: markRead } = useMutation({
    mutationFn: async (notificationId: string) => {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "mark_read", notificationId }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-unread", orgSlug] });
      qc.invalidateQueries({ queryKey: ["notifications", orgSlug] });
    },
  });

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-sm font-semibold">Notifications</span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="min-h-[420px] max-h-[500px] overflow-y-auto p-1">
        {notifications.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No new notifications</p>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              href={n.postId ? `/${orgSlug}/feedback/${n.postId}` : undefined}
              onClick={() => {
                if (!n.readAt) markRead(n.id);
                onClose();
              }}
            />
          ))
        )}
      </div>

      <div className="border-t border-border p-1">
        <Link
          to={`/${orgSlug}/notifications`}
          onClick={onClose}
          className="flex w-full items-center justify-center rounded-md py-1.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          See all notifications
        </Link>
      </div>
    </>
  );
}
