import { cn } from "@lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Bot,
  GitMerge,
  MessageSquare,
  ToggleRight,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { Link } from "react-router";
import type { Notification } from "../schemas/notification";

const TYPE_ICON: Record<string, React.ElementType> = {
  new_comment: MessageSquare,
  new_post: UserPlus,
  post_merged: GitMerge,
  status_changed: ToggleRight,
  mention: Bell,
  vote_milestone: TrendingUp,
  autopilot_duplicate: Bot,
};

const TYPE_COLOR: Record<string, string> = {
  new_comment: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  new_post: "bg-green-500/10 text-green-600 dark:text-green-400",
  post_merged: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  status_changed: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  mention: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  vote_milestone: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  autopilot_duplicate: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

export function notificationText(n: Notification): string {
  const actor = n.metadata?.actorName ?? "Someone";
  const title = n.metadata?.postTitle ? `"${n.metadata.postTitle}"` : "a post";
  switch (n.type) {
    case "new_comment":
      return `${actor} commented on ${title}`;
    case "new_post":
      return `${actor} created a new post ${title}`;
    case "post_merged":
      return `${title} was merged into another post`;
    case "status_changed": {
      const from = n.metadata?.oldStatus ?? "unknown";
      const to = n.metadata?.newStatus ?? "unknown";
      return `${title} status changed from ${from} to ${to}`;
    }
    case "mention":
      return `${actor} mentioned you in a comment on ${title}`;
    case "vote_milestone":
      return `${title} reached ${n.metadata?.voteCount?.toLocaleString()} votes`;
    case "autopilot_duplicate": {
      const confidence = n.metadata?.confidence ?? "medium";
      const matchedTitle = n.metadata?.duplicateOfTitle
        ? `"${n.metadata.duplicateOfTitle}"`
        : "an existing post";
      return `Autopilot flagged ${title} as a ${confidence}-confidence duplicate of ${matchedTitle}`;
    }
    default:
      return "New notification";
  }
}

interface Props {
  notification: Notification;
  href?: string;
  onClick?: () => void;
}

export function NotificationItem({ notification: n, href, onClick }: Props) {
  const Icon = TYPE_ICON[n.type] ?? Bell;
  const colorClass = TYPE_COLOR[n.type] ?? "bg-muted text-muted-foreground";
  const isUnread = !n.readAt;

  const className = cn(
    "w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-accent",
    isUnread && "bg-orange-500/5 dark:bg-orange-500/10",
  );

  const body = (
    <>
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          colorClass,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[12.5px] leading-snug",
            isUnread ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {notificationText(n)}
        </p>
        {n.metadata?.commentBody && (
          <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1 italic">
            "{n.metadata.commentBody}"
          </p>
        )}
        <p className="mt-0.5 text-[10.5px] text-muted-foreground">
          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
        </p>
      </div>
      {isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />}
    </>
  );

  if (href) {
    return (
      <Link to={href} onClick={onClick} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}
