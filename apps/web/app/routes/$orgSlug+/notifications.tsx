import { SidebarTrigger } from "@components/ui/sidebar";
import { requireOrganization } from "@features/auth/server/guards";
import { NotificationItem } from "@features/notifications/components/notification-item";
import type { Notification } from "@features/notifications/schemas/notification";
import { markAllNotificationsRead } from "@features/notifications/server/mutations";
import { getNotificationsForUser } from "@features/notifications/server/queries";
import { cn } from "@lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLoaderData, useParams } from "react-router";
import type { Route } from "./+types/notifications";

export function meta() {
  return [{ title: "Notifications – Feeduro" }];
}

const FILTER_TABS = [
  { label: "All", value: "all" },
  { label: "Comments", value: "new_comment" },
  { label: "Posts", value: "new_post" },
  { label: "Status", value: "status_changed" },
  { label: "Merges", value: "post_merged" },
  { label: "Mentions", value: "mention" },
  { label: "Votes", value: "vote_milestone" },
] as const;

type FilterValue = (typeof FILTER_TABS)[number]["value"];

export async function loader({ request }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrganization(request);
  const notifications = await getNotificationsForUser(session.user.id, organizationId, {
    limit: 100,
  });
  // mark all as read when visiting full page
  await markAllNotificationsRead(session.user.id, organizationId);
  return { notifications, userName: session.user.name ?? session.user.email };
}

export default function NotificationsPage() {
  const { notifications: initial, userName } = useLoaderData<typeof loader>();
  const { orgSlug = "" } = useParams();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterValue>("all");

  const { data } = useQuery<{ notifications: Notification[]; unreadCount: number }>({
    queryKey: ["notifications", orgSlug],
    queryFn: async () => {
      const r = await fetch("/api/notifications?limit=100");
      return r.json();
    },
    initialData: { notifications: initial as Notification[], unreadCount: 0 },
    staleTime: 10_000,
  });

  const { mutate: markRead } = useMutation({
    mutationFn: async (notificationId: string) => {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "mark_read", notificationId }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", orgSlug] });
      qc.invalidateQueries({ queryKey: ["notifications-unread", orgSlug] });
    },
  });

  const notifications = data?.notifications ?? [];
  const filtered =
    filter === "all" ? notifications : notifications.filter((n) => n.type === filter);

  return (
        <>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">{userName}</span>
        </header>

        <div className="mx-auto w-full max-w-2xl px-6 py-6">
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-base font-semibold">Notifications</h1>
            <span className="text-xs text-muted-foreground tabular-nums">
              {filtered.length} {filtered.length === 1 ? "notification" : "notifications"}
            </span>
          </div>

          {/* Filter tabs */}
          <div className="mb-4 flex flex-wrap gap-1 border-b border-border pb-3">
            {FILTER_TABS.map((tab) => {
              const count =
                tab.value === "all"
                  ? notifications.length
                  : notifications.filter((n) => n.type === tab.value).length;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFilter(tab.value)}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    filter === tab.value
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] leading-none tabular-nums",
                        filter === tab.value ? "bg-background/20" : "bg-muted",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Notification list */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-sm font-medium">No notifications</p>
              <p className="mt-1 text-xs text-muted-foreground">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  href={n.postId ? `/${orgSlug}/feedback/${n.postId}` : undefined}
                  onClick={() => {
                    if (!n.readAt) markRead(n.id);
                  }}
                />
              ))}
            </div>
          )}
        </div>
        </>
  );
}
