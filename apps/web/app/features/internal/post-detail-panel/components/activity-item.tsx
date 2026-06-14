import { ADMIN_STATUS_CONFIG } from "@features/feedback/constants";
import type { ActivityData, AdminStatus } from "@features/feedback/schemas/admin";
import { timeAgo } from "@features/feedback/utils";
import { StatusCircleIcon } from "@features/roadmap/components/status-circle-icon";
import { cn } from "@lib/utils";
import { GitMerge, UserCheck } from "lucide-react";

export function ActivityItem({
  activity,
  onOpenPost,
}: {
  activity: ActivityData;
  onOpenPost?: (id: string) => void;
}) {
  const { type, userName, createdAt, oldValue, newValue } = activity;

  if (type === "merged") {
    return (
      <div className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground flex-wrap">
        <GitMerge className="h-3 w-3 text-violet-500 shrink-0" />
        <span className="font-medium text-foreground/80">{userName ?? "Someone"}</span>
        <span>merged</span>
        <span className="font-medium text-foreground/80 max-w-[160px] truncate">
          {oldValue ?? "a post"}
        </span>
        <span>into this post</span>
        <span className="text-muted-foreground/40">·</span>
        <span>{timeAgo(createdAt)}</span>
      </div>
    );
  }
  if (type === "merged_into") {
    return (
      <div className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground flex-wrap">
        <GitMerge className="h-3 w-3 text-violet-500 shrink-0" />
        <span className="font-medium text-foreground/80">{userName ?? "Someone"}</span>
        <span>merged this into</span>
        <button
          type="button"
          onClick={() => onOpenPost?.(newValue)}
          className="font-medium text-foreground/80 hover:text-foreground underline underline-offset-2 hover:no-underline max-w-[160px] truncate"
        >
          {oldValue ?? "another post"}
        </button>
        <span className="text-muted-foreground/40">·</span>
        <span>{timeAgo(createdAt)}</span>
      </div>
    );
  }
  if (type === "unmerged") {
    return (
      <div className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground flex-wrap">
        <GitMerge className="h-3 w-3 text-muted-foreground/60 shrink-0" />
        <span className="font-medium text-foreground/80">{userName ?? "Someone"}</span>
        <span>unmerged</span>
        <span className="font-medium text-foreground/80 max-w-[160px] truncate">
          {oldValue ?? "a post"}
        </span>
        <span>from this post</span>
        <span className="text-muted-foreground/40">·</span>
        <span>{timeAgo(createdAt)}</span>
      </div>
    );
  }
  if (type === "unmerged_from") {
    return (
      <div className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground flex-wrap">
        <GitMerge className="h-3 w-3 text-muted-foreground/60 shrink-0" />
        <span className="font-medium text-foreground/80">{userName ?? "Someone"}</span>
        <span>unmerged this post from</span>
        <button
          type="button"
          onClick={() => onOpenPost?.(newValue)}
          className="font-medium text-foreground/80 hover:text-foreground underline underline-offset-2 hover:no-underline max-w-[160px] truncate"
        >
          {oldValue ?? "another post"}
        </button>
        <span className="text-muted-foreground/40">·</span>
        <span>{timeAgo(createdAt)}</span>
      </div>
    );
  }

  if (type === "owner_assigned") {
    const isUnassign = newValue === "Unassigned";
    return (
      <div className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground flex-wrap">
        <UserCheck className="h-3 w-3 text-blue-500 shrink-0" />
        <span className="font-medium text-foreground/80">{userName ?? "Someone"}</span>
        {isUnassign ? (
          <span>unassigned this post</span>
        ) : (
          <>
            <span>assigned to</span>
            <span className="font-medium text-foreground/80">{newValue}</span>
          </>
        )}
        <span className="text-muted-foreground/40">·</span>
        <span>{timeAgo(createdAt)}</span>
      </div>
    );
  }

  const newSt = newValue as AdminStatus;
  const stCfg = ADMIN_STATUS_CONFIG[newSt];
  return (
    <div className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground">
      <StatusCircleIcon status={newSt} size={12} />
      <span className="font-medium text-foreground/80">{userName ?? "Someone"}</span>
      <span>changed status to</span>
      <span className={cn("font-semibold", stCfg?.textColor)}>{stCfg?.label ?? newSt}</span>
      <span className="text-muted-foreground/50">·</span>
      <span>{timeAgo(createdAt)}</span>
    </div>
  );
}
