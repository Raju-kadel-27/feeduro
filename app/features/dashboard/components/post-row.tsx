import { MessageSquare } from "lucide-react";
import { StatusPill } from "./status-pill";
import { UserAvatar } from "./user-avatar";
import { VotePill } from "./vote-pill";
import type { Board, Post } from "../types";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffH = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  if (diffH < 1) return "just now";
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  if (diffH < 48) return "yesterday";
  if (diffH < 24 * 7) return `${Math.floor(diffH / 24)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PostRow({
  post,
  board,
  queryKey,
  usersMap,
  onOpen,
}: {
  post: Post;
  board: Board | undefined;
  queryKey: readonly unknown[];
  usersMap: Record<string, { name: string; image: string | null }>;
  onOpen: (id: string) => void;
}) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 hover:bg-[#fafafa] transition-colors cursor-pointer group border-b last:border-b-0"
      onClick={() => onOpen(post.id)}
    >
      <div className="mt-0.5 shrink-0">
        <VotePill post={post} queryKey={queryKey} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-medium leading-snug group-hover:text-[#6d28d9] transition-colors truncate min-w-0">
            {post.title}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusPill status={post.status} />
            {board && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] border border-[#d1d5db] text-[#6b7280] font-medium whitespace-nowrap">
                {board.name}
              </span>
            )}
            {post.commentCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-[#a1a1aa]">
                <MessageSquare className="h-3 w-3" />
                {post.commentCount}
              </span>
            )}
          </div>
        </div>
        {post.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 leading-relaxed">
            {post.description}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0 mt-0.5">
        <UserAvatar userId={post.createdBy} usersMap={usersMap} size="sm" />
        <span className="text-[10px] text-[#a1a1aa] tabular-nums whitespace-nowrap">
          {formatDate(post.createdAt)}
        </span>
      </div>
    </div>
  );
}
