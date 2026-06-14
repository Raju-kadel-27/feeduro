import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover";
import { cn } from "@lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { playNotificationSound, useNotificationSound } from "../hooks/use-notification-sound";
import type { Notification } from "../schemas/notification";
import { NotificationsPopover } from "./notifications-popover";

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export function NotificationsBell() {
  const { orgSlug = "" } = useParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data } = useQuery<NotificationsResponse>({
    queryKey: ["notifications-unread", orgSlug],
    queryFn: async () => {
      const r = await fetch("/api/notifications?unreadOnly=true&limit=8");
      return r.json() as Promise<NotificationsResponse>;
    },
    enabled: !!orgSlug,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { mutate: markAllRead } = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "mark_all_read" }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-unread", orgSlug] });
      qc.invalidateQueries({ queryKey: ["notifications", orgSlug] });
    },
  });

  const { soundEnabled } = useNotificationSound();
  // -1 = not yet initialized (skip sound on first data arrival)
  const prevUnreadRef = useRef<number>(-1);

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  useEffect(() => {
    if (prevUnreadRef.current === -1) {
      prevUnreadRef.current = unreadCount;
      return;
    }
    if (soundEnabled && unreadCount > prevUnreadRef.current) {
      playNotificationSound();
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount, soundEnabled]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors",
            open && "bg-sidebar-accent text-foreground",
          )}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[8px] font-bold text-white leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-0">
        <NotificationsPopover
          notifications={notifications}
          unreadCount={unreadCount}
          orgSlug={orgSlug}
          onClose={() => setOpen(false)}
          onMarkAllRead={() => markAllRead()}
        />
      </PopoverContent>
    </Popover>
  );
}
